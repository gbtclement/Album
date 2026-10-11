import { type DeezerGet, findDeezerArtist } from "@/lib/artist-photo-rules";
import { db } from "@/lib/db";

// Photos d'artistes (onglet Artistes de la collection), récupérées sur l'API publique de Deezer, sans clé.
// Deezer accepte 50 requêtes toutes les 5 secondes : on en fait au plus une toutes les 150 ms.

const DEEZER_API = "https://api.deezer.com";
const DEEZER_DELAY_MS = 150;
const MAX_ATTEMPTS = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Deezer répond 200 même en cas d'erreur, avec { error: { code } } : le code 4 veut dire « trop de requêtes »
export const deezerGet: DeezerGet = async (path) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${DEEZER_API}${path}`, { signal: AbortSignal.timeout(15_000) });
    const body = res.ok ? ((await res.json()) as { data?: unknown[]; error?: { code?: number; message?: string } }) : null;
    if (body && !body.error) return body;
    const busy = !res.ok ? res.status === 429 || res.status >= 500 : body?.error?.code === 4;
    if (!busy || attempt === MAX_ATTEMPTS) {
      if (body?.error) return null; // artiste ou album introuvable : pas une panne
      throw new Error(`Deezer a répondu ${res.status}`);
    }
    await sleep(5000 * attempt);
  }
};

// Artistes jamais cherchés, ou cherchés sans résultat il y a plus de `days` jours (une photo trouvée est gardée)
async function artistsToCheck(days: number, max: number) {
  const { rows } = await db.query<{ artist: string; titles: string[] }>(
    `select a.artist, array_agg(a.title order by a.title) as titles
     from albums a
     left join artist_photos p on p.artist = a.artist
     where p.artist is null or (p.photo_url is null and p.checked_at < now() - make_interval(days => $1))
     group by a.artist
     order by count(*) desc, a.artist
     limit $2`,
    [days, max],
  );
  return rows;
}

export async function syncArtistPhotos({
  days = 30,
  max = Infinity,
  log = console.log,
  get = deezerGet,
  delayMs = DEEZER_DELAY_MS,
}: { days?: number; max?: number; log?: (message: string) => void; get?: DeezerGet; delayMs?: number } = {}) {
  const artists = await artistsToCheck(days, Number.isFinite(max) ? max : 1_000_000);
  log(`Photos d'artistes : ${artists.length} artistes à chercher sur Deezer.`);
  // Chaque appel à Deezer attend son tour : jamais plus d'une requête toutes les delayMs
  const paced: DeezerGet = async (path) => {
    await sleep(delayMs);
    return get(path);
  };

  let found = 0;
  for (const [index, { artist, titles }] of artists.entries()) {
    const match = await findDeezerArtist(artist, titles, paced);
    await db.query(
      `insert into artist_photos (artist, deezer_id, photo_url, checked_at) values ($1, $2, $3, now())
       on conflict (artist) do update set deezer_id = excluded.deezer_id, photo_url = excluded.photo_url, checked_at = now()`,
      [artist, match?.id ?? null, match?.picture ?? null],
    );
    if (match) found++;
    if ((index + 1) % 100 === 0) log(`Photos d'artistes : ${index + 1}/${artists.length}, ${found} trouvées.`);
  }
  log(`Photos d'artistes terminé : ${found} photos sur ${artists.length} artistes.`);
  return { checked: artists.length, found };
}
