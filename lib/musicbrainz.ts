import { cached, WEEK } from "@/lib/cache";

// MusicBrainz demande un User-Agent identifiant l'application et un contact.
// Limite : une requête par seconde maximum, sinon l'IP peut être bloquée.
const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = `Musicodex/0.1 (${process.env.MUSICBRAINZ_CONTACT ?? "https://github.com/gbtclement/Album"})`;
const MIN_DELAY_MS = 1100;

let lastRequestAt = 0;

// MusicBrainz répond souvent "occupé" (503) aux heures chargées : on insiste jusqu'à 8 fois (environ 2 minutes)
const MAX_ATTEMPTS = 8;

async function mbGet<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequestAt + MIN_DELAY_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();

    const res = await fetch(`${MB_BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    }).catch((error: Error) => {
      // Coupure réseau passagère : on réessaie comme pour une surcharge
      if (attempt === MAX_ATTEMPTS) throw new Error(`MusicBrainz injoignable (${error.message})`);
      return null;
    });
    if (res?.ok) return (await res.json()) as T;
    // 503 : MusicBrainz est surchargé ou nous demande de ralentir. On patiente de plus en plus, puis on réessaie.
    if (res && (res.status !== 503 || attempt === MAX_ATTEMPTS)) throw new Error(`MusicBrainz a répondu ${res.status}`);
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
}

// Caractères spéciaux de la syntaxe de recherche Lucene
function escapeLucene(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

type SearchResponse = {
  "release-groups": Array<{
    id: string;
    score: number;
    title: string;
    "first-release-date"?: string;
    "artist-credit"?: Array<{ name: string }>;
  }>;
};

export type ReleaseGroupMatch = {
  mbid: string;
  title: string;
  artist: string;
  releaseYear: number | null;
};

// Cherche un album par titre et artiste. On ne garde que les correspondances très fiables.
export async function searchReleaseGroup(artist: string, title: string): Promise<ReleaseGroupMatch | null> {
  const query = `releasegroup:"${escapeLucene(title)}" AND artist:"${escapeLucene(artist)}" AND primarytype:album`;
  const data = await cached(`mb:search:${query}`, WEEK, () =>
    mbGet<SearchResponse>(`/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=5`),
  );

  const best = data["release-groups"].find((group) => group.score >= 90);
  if (!best) return null;

  return {
    mbid: best.id,
    title: best.title,
    artist: best["artist-credit"]?.[0]?.name ?? artist,
    releaseYear: yearOf(best["first-release-date"]),
  };
}

type ReleaseGroupDetails = {
  id: string;
  title: string;
  "primary-type"?: string | null;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  "artist-credit"?: Array<{ name: string; joinphrase?: string }>;
};

export type ReleaseGroupInfo = ReleaseGroupMatch & { studioAlbum: boolean };

// Un album studio : type principal "Album", sans type secondaire (Live, Compilation, Soundtrack, Remix...)
export function isStudioAlbum(primaryType: string | null | undefined, secondaryTypes: string[] | undefined) {
  return primaryType === "Album" && (secondaryTypes ?? []).length === 0;
}

function yearOf(date: string | undefined) {
  const year = date ? parseInt(date.slice(0, 4), 10) : NaN;
  return Number.isNaN(year) ? null : year;
}

// "Daft Punk" ou "Jay-Z & Kanye West" : le crédit complet tel qu'affiché sur la pochette
function creditName(credit: ReleaseGroupDetails["artist-credit"], fallback: string) {
  if (!credit?.length) return fallback;
  return credit.map((part) => part.name + (part.joinphrase ?? "")).join("").trim();
}

function toInfo(group: ReleaseGroupDetails, artistFallback = ""): ReleaseGroupInfo {
  return {
    mbid: group.id,
    title: group.title,
    artist: creditName(group["artist-credit"], artistFallback),
    releaseYear: yearOf(group["first-release-date"]),
    studioAlbum: isStudioAlbum(group["primary-type"], group["secondary-types"]),
  };
}

// Détails de plusieurs albums, 50 identifiants par requête. Un lot en échec est signalé puis sauté.
export async function lookupReleaseGroups(mbids: string[], batchSize = 50): Promise<ReleaseGroupInfo[]> {
  const infos: ReleaseGroupInfo[] = [];
  for (let start = 0; start < mbids.length; start += batchSize) {
    const batch = mbids.slice(start, start + batchSize);
    const query = `rgid:(${batch.join(" OR ")})`;
    try {
      const data = await mbGet<{ "release-groups": ReleaseGroupDetails[] }>(
        `/release-group/?query=${encodeURIComponent(query)}&fmt=json&limit=${batchSize}`,
      );
      infos.push(...data["release-groups"].map((group) => toInfo(group)));
    } catch (error) {
      console.log(`Détails MusicBrainz indisponibles pour ${batch.length} albums : ${(error as Error).message}`);
    }
  }
  return infos;
}

// Albums studio d'un artiste. Les sorties officielles sont rangées avec les concerts pirates et
// les compilations : on ne garde que les albums studio, triés ensuite par écoutes.
export async function browseArtistAlbums(artistMbid: string, artistName: string, maxPages = 2) {
  const albums: ReleaseGroupInfo[] = [];
  for (let page = 0; page < maxPages; page++) {
    // Mise en cache : relancer un import ne redemande pas les discographies déjà parcourues
    // Avec le crédit de chaque album : le nom exact de l'artiste (« JAY-Z » sur Last.fm, « JAY‐Z » sur MusicBrainz)
    const data = await cached(`mb:artist-albums-credits:${artistMbid}:${page}`, WEEK, () =>
      mbGet<{ "release-groups": ReleaseGroupDetails[]; "release-group-count": number }>(
        `/release-group?artist=${artistMbid}&type=album&inc=artist-credits&fmt=json&limit=100&offset=${page * 100}`,
      ),
    );
    albums.push(...data["release-groups"].map((group) => toInfo(group, artistName)).filter((info) => info.studioAlbum));
    if ((page + 1) * 100 >= data["release-group-count"]) break;
  }
  return albums;
}

// Artistes MusicBrainz portant ce nom (plusieurs en cas d'homonymes), avec leur score de correspondance
export async function searchArtists(name: string): Promise<Array<{ id: string; name: string; score: number }>> {
  const query = `artist:"${escapeLucene(name)}"`;
  const data = await cached(`mb:artist-search:${name.toLowerCase()}`, WEEK, () =>
    mbGet<{ artists: Array<{ id: string; name: string; score: number }> }>(`/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=5`),
  );
  return data.artists.map(({ id, name: found, score }) => ({ id, name: found, score }));
}

type LookupResponse = {
  relations?: Array<{ url?: { resource: string } }>;
};

// Liste les adresses web liées à l'album (Spotify, Deezer, YouTube...)
export async function lookupReleaseGroupUrls(mbid: string): Promise<string[]> {
  const data = await cached(`mb:rg:${mbid}`, WEEK, () =>
    mbGet<LookupResponse>(`/release-group/${mbid}?inc=url-rels&fmt=json`),
  );
  return (data.relations ?? []).flatMap((relation) => (relation.url ? [relation.url.resource] : []));
}

type CoverArtResponse = {
  images: Array<{ front: boolean; image: string; thumbnails: Record<string, string> }>;
};

// Pochette depuis Cover Art Archive (service lié à MusicBrainz, pas soumis à la même limite)
export async function fetchCoverUrl(mbid: string): Promise<string | null> {
  const res = await fetch(`https://coverartarchive.org/release-group/${mbid}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cover Art Archive a répondu ${res.status}`);

  const data = (await res.json()) as CoverArtResponse;
  const front = data.images.find((image) => image.front) ?? data.images[0];
  if (!front) return null;
  // L'API répond parfois en http:// : le même fichier est servi en https://
  return (front.thumbnails["500"] ?? front.image).replace(/^http:\/\//, "https://");
}
