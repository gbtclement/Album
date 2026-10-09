import { cached, WEEK } from "@/lib/cache";

// MusicBrainz demande un User-Agent identifiant l'application et un contact.
// Limite : une requête par seconde maximum, sinon l'IP peut être bloquée.
const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = `Album/0.1 (${process.env.MUSICBRAINZ_CONTACT ?? "https://github.com/gbtclement/Album"})`;
const MIN_DELAY_MS = 1100;

let lastRequestAt = 0;

async function mbGet<T>(path: string): Promise<T> {
  const wait = lastRequestAt + MIN_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const res = await fetch(`${MB_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`MusicBrainz a répondu ${res.status}`);
  return (await res.json()) as T;
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

  const year = best["first-release-date"] ? parseInt(best["first-release-date"].slice(0, 4), 10) : NaN;
  return {
    mbid: best.id,
    title: best.title,
    artist: best["artist-credit"]?.[0]?.name ?? artist,
    releaseYear: Number.isNaN(year) ? null : year,
  };
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
  return front.thumbnails["500"] ?? front.image;
}
