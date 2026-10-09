// Last.fm : classement mondial des albums les plus écoutés (playcount).
// Clé gratuite à créer sur https://www.last.fm/api/account/create et à mettre dans LASTFM_API_KEY.

export type LastfmAlbum = {
  title: string;
  artist: string;
  playcount: number;
  listeners: number;
};

type TopAlbumsResponse = {
  albums?: {
    album?: Array<{
      name: string;
      playcount: string;
      listeners: string;
      artist: { name: string };
    }>;
  };
};

const PAGE_SIZE = 200;

export function lastfmEnabled() {
  return Boolean(process.env.LASTFM_API_KEY);
}

// Récupère les `total` albums les plus écoutés. Ne journalise jamais l'URL (elle contient la clé).
export async function fetchLastfmTopAlbums(total: number): Promise<LastfmAlbum[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("LASTFM_API_KEY n'est pas renseignée dans .env");

  const albums: LastfmAlbum[] = [];
  const pages = Math.ceil(total / PAGE_SIZE);

  for (let page = 1; page <= pages; page++) {
    const url =
      `https://ws.audioscrobbler.com/2.0/?method=chart.gettopalbums` +
      `&api_key=${apiKey}&format=json&limit=${PAGE_SIZE}&page=${page}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Last.fm a répondu ${res.status} (page ${page})`);

    const data = (await res.json()) as TopAlbumsResponse;
    for (const item of data.albums?.album ?? []) {
      albums.push({
        title: item.name,
        artist: item.artist.name,
        playcount: Number(item.playcount),
        listeners: Number(item.listeners),
      });
    }
    // Politesse envers l'API : on reste bien en dessous de sa limite de requêtes
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return albums.slice(0, total);
}
