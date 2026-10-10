import { cached, WEEK } from "@/lib/cache";
import type { AlbumLinks } from "@/lib/catalog";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Liens exacts trouvés dans MusicBrainz (il arrive qu'ils soient absents)
export function linksFromUrls(urls: string[]): AlbumLinks {
  const links: AlbumLinks = {};
  for (const url of urls) {
    if (!links.spotify && url.includes("open.spotify.com/album/")) {
      links.spotify = { url, exact: true };
    } else if (!links.deezer && url.includes("deezer.com/") && url.includes("/album/")) {
      links.deezer = { url, exact: true };
    } else if (!links.youtube && url.includes("youtube.com/playlist")) {
      links.youtube = { url, exact: true };
    }
  }
  return links;
}

type DeezerSearchResponse = {
  data?: Array<{ title: string; link: string; cover_big?: string; artist: { name: string } }>;
};

// Deezer ne demande pas de clé pour la recherche publique.
// Seul un album au titre et à l'artiste identiques compte (pas le premier résultat venu).
async function searchDeezerAlbum(artist: string, title: string) {
  const query = `artist:"${artist}" album:"${title}"`;
  const data = await cached(`deezer:search:${query}`, WEEK, async () => {
    const res = await fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { data: [] } as DeezerSearchResponse;
    return (await res.json()) as DeezerSearchResponse;
  });

  return (
    data.data?.find(
      (album) => normalize(album.title) === normalize(title) && normalize(album.artist.name) === normalize(artist),
    ) ?? null
  );
}

async function findDeezerAlbum(artist: string, title: string): Promise<string | null> {
  return (await searchDeezerAlbum(artist, title))?.link ?? null;
}

// Pochette Deezer (500 x 500) : plan B quand Cover Art Archive n'en a pas, ou plus
export async function findDeezerCover(artist: string, title: string): Promise<string | null> {
  return (await searchDeezerAlbum(artist, title))?.cover_big ?? null;
}

// Assemble les liens d'écoute : liens exacts quand ils existent, sinon recherche.
// Les liens de recherche sont marqués exact: false pour que l'interface le signale.
export async function buildLinks(artist: string, title: string, urls: string[]): Promise<AlbumLinks> {
  const links = linksFromUrls(urls);
  const searchTerms = encodeURIComponent(`${artist} ${title}`);

  if (!links.deezer) {
    const deezerUrl = await findDeezerAlbum(artist, title);
    links.deezer = deezerUrl
      ? { url: deezerUrl, exact: true }
      : { url: `https://www.deezer.com/search/${searchTerms}/album`, exact: false };
  }
  if (!links.spotify) {
    links.spotify = { url: `https://open.spotify.com/search/${searchTerms}`, exact: false };
  }
  if (!links.youtube) {
    links.youtube = { url: `https://www.youtube.com/results?search_query=${searchTerms}`, exact: false };
  }
  return links;
}
