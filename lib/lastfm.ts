// Last.fm : nombre d'écoutes et d'auditeurs d'un album (méthode album.getInfo), avec une clé API gratuite
// (LASTFM_API_KEY dans .env, à créer sur https://www.last.fm/api/account/create).
// Last.fm ne connaît pas nos identifiants d'album (MusicBrainz « release group ») : on cherche par artiste
// et titre, avec la correction automatique des noms de Last.fm.
// Ces chiffres sont seulement affichés : la rareté reste calculée avec ListenBrainz.

import { db } from "@/lib/db";

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";
const USER_AGENT = `Album/0.1 (${process.env.MUSICBRAINZ_CONTACT ?? "https://github.com/gbtclement/Album"})`;
const MAX_ATTEMPTS = 5;
// Last.fm demande de rester raisonnable (environ 5 requêtes par seconde) : on en fait 4
export const LASTFM_DELAY_MS = 250;

export type LastfmStats = { playcount: number; listeners: number };

export function lastfmKey() {
  return process.env.LASTFM_API_KEY?.trim() || null;
}

export class LastfmError extends Error {}

// Codes d'erreur Last.fm : 6 = album introuvable ; 11, 16 = service momentanément indisponible ; 29 = trop de requêtes
const NOT_FOUND = 6;
const RETRYABLE = new Set([11, 16, 29]);

type AlbumInfoResponse = {
  error?: number;
  message?: string;
  album?: { playcount?: string | number; listeners?: string | number };
};

// Extrait les chiffres de la réponse d'album.getInfo (null si l'album est inconnu ou sans écoute)
export function parseAlbumInfo(json: AlbumInfoResponse): LastfmStats | null {
  const playcount = Number(json.album?.playcount);
  const listeners = Number(json.album?.listeners);
  if (!Number.isFinite(playcount) || playcount <= 0) return null;
  return { playcount, listeners: Number.isFinite(listeners) ? listeners : 0 };
}

export async function fetchLastfmAlbum(artist: string, title: string): Promise<LastfmStats | null> {
  const key = lastfmKey();
  if (!key) throw new LastfmError("LASTFM_API_KEY manquant dans .env");
  const params = new URLSearchParams({ method: "album.getinfo", api_key: key, artist, album: title, autocorrect: "1", format: "json" });

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${LASTFM_BASE}?${params}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    const json = (await res.json().catch(() => ({}))) as AlbumInfoResponse;
    if (json.error === NOT_FOUND) return null;
    if (res.ok && !json.error) return parseAlbumInfo(json);
    // Clé refusée (10, 26) ou autre erreur définitive : inutile de continuer l'import
    const retryable = res.status >= 500 || res.status === 429 || (json.error !== undefined && RETRYABLE.has(json.error));
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new LastfmError(`Last.fm a répondu ${json.error ? `erreur ${json.error} (${json.message ?? "?"})` : res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

// Enregistre le résultat d'une recherche, même vide (l'album ne sera pas recherché de nouveau tout de suite)
export async function saveLastfm(albumId: string, stats: LastfmStats | null) {
  await db.query(
    `update albums set lastfm_playcount = $2, lastfm_listeners = $3, lastfm_checked_at = now(), updated_at = now()
     where id = $1`,
    [albumId, stats?.playcount ?? null, stats?.listeners ?? null],
  );
}

// Albums à (re)chercher : jamais cherchés, ou cherchés il y a plus de `days` jours ; les plus écoutés d'abord
export async function albumsToCheck(days: number, limit: number) {
  const { rows } = await db.query<{ id: string; artist: string; title: string }>(
    `select id, artist, title from albums
     where lastfm_checked_at is null or lastfm_checked_at < now() - make_interval(days => $1)
     order by lastfm_checked_at nulls first, listen_count desc nulls last
     limit $2`,
    [days, limit],
  );
  return rows;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Met à jour les écoutes Last.fm du catalogue. Une erreur définitive (clé refusée...) arrête tout ;
// relancer reprend là où on s'est arrêté, grâce à lastfm_checked_at.
export async function syncLastfm({ days = 30, max = Infinity, log = console.log } = {}) {
  const albums = await albumsToCheck(days, Number.isFinite(max) ? max : 1_000_000);
  log(`Last.fm : ${albums.length} albums à vérifier.`);
  let found = 0;
  for (const [index, album] of albums.entries()) {
    const stats = await fetchLastfmAlbum(album.artist, album.title);
    await saveLastfm(album.id, stats);
    if (stats) found++;
    if ((index + 1) % 100 === 0) log(`Last.fm : ${index + 1}/${albums.length}, ${found} trouvés.`);
    await sleep(LASTFM_DELAY_MS);
  }
  log(`Last.fm terminé : ${found} albums sur ${albums.length} trouvés.`);
  return { checked: albums.length, found };
}
