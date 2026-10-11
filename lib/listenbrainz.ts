// ListenBrainz (le service d'écoutes de MusicBrainz) : statistiques publiques, sans clé.
//  - classement des albums les plus écoutés sur tout le site (1000 maximum par période)
//  - classement des artistes les plus écoutés
//  - nombre d'écoutes de n'importe quel album, à partir de son identifiant MusicBrainz
// Les identifiants sont ceux de MusicBrainz : aucune recherche par nom n'est nécessaire.

// Adresse de l'API, remplaçable dans .env (ex. le serveur beta-api.listenbrainz.org quand l'adresse principale est en panne)
const LB_BASE = process.env.LISTENBRAINZ_API_URL || "https://api.listenbrainz.org/1";
const USER_AGENT = `Musicodex/0.1 (${process.env.MUSICBRAINZ_CONTACT ?? "https://github.com/gbtclement/Album"})`;
// L'API accepte au plus 1000 éléments par requête de statistiques
const STATS_PAGE = 1000;
const POPULARITY_BATCH = 500;

export const STAT_RANGES = ["all_time", "year", "half_yearly", "quarter", "month", "week"] as const;
export type StatRange = (typeof STAT_RANGES)[number];

export type TopReleaseGroup = {
  mbid: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  listens: number;
};

export type Popularity = { listens: number; listeners: number };

const MAX_ATTEMPTS = 5;

async function lbFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${LB_BASE}${path}`, {
      ...init,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers },
    });
    // 204 : la statistique n'est pas encore calculée pour cette période
    if (res.status === 204) return null;
    if (res.ok) return (await res.json()) as T;
    // 429 (trop de requêtes) ou 503 (surcharge) : on patiente de plus en plus, puis on réessaie
    if ((res.status !== 429 && res.status !== 503) || attempt === MAX_ATTEMPTS) {
      throw new Error(`ListenBrainz a répondu ${res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

// Pochette directement depuis Cover Art Archive, avec l'image que ListenBrainz a choisie
export function coverFromCaa(releaseMbid: string | null | undefined, caaId: number | null | undefined) {
  if (!releaseMbid || !caaId) return null;
  return `https://coverartarchive.org/release/${releaseMbid}/${caaId}-500.jpg`;
}

type SitewideReleaseGroups = {
  payload: {
    release_groups: Array<{
      release_group_mbid: string | null;
      release_group_name: string;
      artist_name: string;
      caa_id: number | null;
      caa_release_mbid: string | null;
      listen_count: number;
    }>;
  };
};

// Les albums les plus écoutés sur une période (1000 maximum, imposé par ListenBrainz)
export async function fetchTopReleaseGroups(range: StatRange): Promise<TopReleaseGroup[]> {
  const data = await lbFetch<SitewideReleaseGroups>(
    `/stats/sitewide/release-groups?range=${range}&count=${STATS_PAGE}&offset=0`,
  );
  return (data?.payload.release_groups ?? []).flatMap((group) =>
    group.release_group_mbid
      ? [{
          mbid: group.release_group_mbid,
          title: group.release_group_name,
          artist: group.artist_name,
          coverUrl: coverFromCaa(group.caa_release_mbid, group.caa_id),
          listens: group.listen_count,
        }]
      : [],
  );
}

type SitewideArtists = {
  payload: { artists: Array<{ artist_mbid: string | null; artist_name: string }> };
};

export type ArtistRef = { mbid: string; name: string };

// Les artistes les plus écoutés sur une période (1000 maximum, imposé par ListenBrainz)
export async function fetchTopArtists(count: number, range: StatRange = "all_time"): Promise<ArtistRef[]> {
  const data = await lbFetch<SitewideArtists>(
    `/stats/sitewide/artists?range=${range}&count=${Math.min(count, STATS_PAGE)}&offset=0`,
  );
  return (data?.payload.artists ?? []).flatMap((artist) =>
    artist.artist_mbid ? [{ mbid: artist.artist_mbid, name: artist.artist_name }] : [],
  );
}

// Artistes que les mêmes auditeurs écoutent (service expérimental « labs » de ListenBrainz)
const SIMILAR_ALGORITHM = "session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30";

export async function fetchSimilarArtists(artistMbid: string, limit: number): Promise<ArtistRef[]> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(
      `https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=${artistMbid}&algorithm=${SIMILAR_ALGORITHM}`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } },
    );
    if (res.ok) {
      const data = (await res.json()) as Array<{ artist_mbid: string | null; name: string }>;
      return data.flatMap((artist) => (artist.artist_mbid ? [{ mbid: artist.artist_mbid, name: artist.name }] : [])).slice(0, limit);
    }
    if ((res.status !== 429 && res.status !== 503) || attempt === MAX_ATTEMPTS) {
      throw new Error(`ListenBrainz (artistes similaires) a répondu ${res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

type PopularityResponse = Array<{
  release_group_mbid: string;
  total_listen_count: number | null;
  total_user_count: number | null;
}>;

// Nombre d'écoutes et d'auditeurs de chaque album, tous temps confondus
export async function fetchPopularity(mbids: string[]): Promise<Map<string, Popularity>> {
  const result = new Map<string, Popularity>();
  for (let start = 0; start < mbids.length; start += POPULARITY_BATCH) {
    const batch = mbids.slice(start, start + POPULARITY_BATCH);
    const data = await lbFetch<PopularityResponse>("/popularity/release-group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ release_group_mbids: batch }),
    });
    for (const item of data ?? []) {
      if (item.total_listen_count !== null) {
        result.set(item.release_group_mbid, {
          listens: item.total_listen_count,
          listeners: item.total_user_count ?? 0,
        });
      }
    }
    // Politesse envers l'API
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return result;
}
