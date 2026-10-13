// Last.fm : nombre d'écoutes et d'auditeurs des albums, avec une clé API gratuite
// (LASTFM_API_KEY dans .env, à créer sur https://www.last.fm/api/account/create).
// Ces chiffres sont affichés sur les fiches album et servent à calculer la rareté (lib/catalog.ts).
//
// Last.fm range chaque version d'un album à part (« Abbey Road », « Abbey Road (Remastered) »...) : on demande la
// liste des albums de chaque artiste (artist.getTopAlbums, une requête par artiste) et on additionne les écoutes de
// toutes les versions d'un même album (lib/lastfm-variants.ts). Un album absent de cette liste est cherché seul
// (album.getInfo), avec la correction automatique des noms de Last.fm.

import { db } from "@/lib/db";
import { lastfmText, matchVariants } from "@/lib/lastfm-variants";

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/";
const USER_AGENT = `Musicodex/0.1 (${process.env.MUSICBRAINZ_CONTACT ?? "https://github.com/gbtclement/Album"})`;
const MAX_ATTEMPTS = 5;
// Last.fm demande de rester raisonnable (environ 5 requêtes par seconde) : on en fait 4
export const LASTFM_DELAY_MS = 250;
// Albums d'un artiste lus sur Last.fm : les 500 premiers suffisent (au-delà, des versions à quelques écoutes)
const TOP_ALBUMS_LIMIT = 500;
// En dessous d'un million d'écoutes, le plafond par auditeur ne change rien à la rareté : pas besoin des auditeurs
const LISTENERS_MIN_PLAYCOUNT = 1_000_000;

export type LastfmStats = { playcount: number; listeners: number | null };

export function lastfmKey() {
  return process.env.LASTFM_API_KEY?.trim() || null;
}

export class LastfmError extends Error {}

// Codes d'erreur Last.fm : 6 = album ou artiste introuvable ; 11, 16 = service momentanément indisponible ; 29 = trop de requêtes
const NOT_FOUND = 6;
const RETRYABLE = new Set([11, 16, 29]);

type LastfmResponse = { error?: number; message?: string };
type AlbumInfoResponse = LastfmResponse & { album?: { playcount?: string | number; listeners?: string | number } };
type TopAlbumsResponse = LastfmResponse & { topalbums?: { album?: Array<{ name?: string; playcount?: string | number }> } };
type ArtistList = { artist?: Array<{ name?: string; mbid?: string }>; "@attr"?: { totalPages?: string } };
type ArtistListResponse = LastfmResponse & { artists?: ArtistList; topartists?: ArtistList };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extrait les chiffres de la réponse d'album.getInfo (null si l'album est inconnu ou sans écoute)
export function parseAlbumInfo(json: AlbumInfoResponse): LastfmStats | null {
  const playcount = Number(json.album?.playcount);
  const listeners = Number(json.album?.listeners);
  if (!Number.isFinite(playcount) || playcount <= 0) return null;
  return { playcount, listeners: Number.isFinite(listeners) ? listeners : 0 };
}

// Une requête à l'API, réessayée si Last.fm est surchargé ; null si l'album ou l'artiste est introuvable
async function lastfmGet<T extends LastfmResponse>(params: Record<string, string>): Promise<T | null> {
  const key = lastfmKey();
  if (!key) throw new LastfmError("LASTFM_API_KEY manquant dans .env");
  const query = new URLSearchParams({ ...params, api_key: key, autocorrect: "1", format: "json" });

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${LASTFM_BASE}?${query}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } }).catch(
      // Coupure réseau passagère : on réessaie comme pour une surcharge
      (error: Error) => {
        if (attempt === MAX_ATTEMPTS) throw new LastfmError(`Last.fm injoignable (${error.message})`);
        return null;
      },
    );
    if (!res) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      continue;
    }
    const json = (await res.json().catch(() => ({}))) as T;
    if (json.error === NOT_FOUND) return null;
    if (res.ok && !json.error) return json;
    // Clé refusée (10, 26) ou autre erreur définitive : inutile de continuer l'import
    const retryable = res.status >= 500 || res.status === 429 || (json.error !== undefined && RETRYABLE.has(json.error));
    if (!retryable || attempt === MAX_ATTEMPTS) {
      throw new LastfmError(`Last.fm a répondu ${json.error ? `erreur ${json.error} (${json.message ?? "?"})` : res.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

// Un album seul (titre et artiste débarrassés des signes typographiques que Last.fm ne reconnaît pas)
export async function fetchLastfmAlbum(artist: string, title: string): Promise<LastfmStats | null> {
  const json = await lastfmGet<AlbumInfoResponse>({ method: "album.getinfo", artist: lastfmText(artist), album: lastfmText(title) });
  return json ? parseAlbumInfo(json) : null;
}

// Tous les albums d'un artiste sur Last.fm, versions comprises, avec leurs écoutes
export async function fetchArtistTopAlbums(artist: string) {
  const json = await lastfmGet<TopAlbumsResponse>({ method: "artist.gettopalbums", artist: lastfmText(artist), limit: String(TOP_ALBUMS_LIMIT) });
  return (json?.topalbums?.album ?? []).map((album) => ({ name: album.name ?? "", playcount: Number(album.playcount) || 0 }));
}

// Classements d'artistes : mondial (10 000 au plus), par pays (nom anglais : « France ») ou par genre (« french rap »)
export type ArtistChart = { chart: true } | { country: string } | { tag: string };
const ARTIST_PAGE = 500;

export async function fetchLastfmArtists(source: ArtistChart, count: number, delayMs = LASTFM_DELAY_MS) {
  const params: Record<string, string> =
    "country" in source
      ? { method: "geo.gettopartists", country: source.country }
      : "tag" in source
        ? { method: "tag.gettopartists", tag: source.tag }
        : { method: "chart.gettopartists" };
  const artists: Array<{ name: string; mbid: string | null }> = [];
  for (let page = 1; artists.length < count; page++) {
    const json = await lastfmGet<ArtistListResponse>({ ...params, limit: String(ARTIST_PAGE), page: String(page) });
    const list = json?.artists ?? json?.topartists;
    const batch = (list?.artist ?? []).flatMap((artist) => (artist.name ? [{ name: artist.name, mbid: artist.mbid || null }] : []));
    artists.push(...batch);
    await sleep(delayMs);
    // Après la dernière page, Last.fm renvoie une liste vide ou répète la précédente
    if (batch.length === 0 || page >= Number(list?.["@attr"]?.totalPages ?? 0)) break;
  }
  return artists.slice(0, count);
}

// Enregistre le résultat d'une recherche, même vide (l'album ne sera pas recherché de nouveau tout de suite)
export async function saveLastfm(albumId: string, stats: LastfmStats | null) {
  await db.query(
    `update albums set lastfm_playcount = $2, lastfm_listeners = $3, lastfm_checked_at = now(), updated_at = now()
     where id = $1`,
    [albumId, stats?.playcount ?? null, stats?.listeners ?? null],
  );
}

// Artistes dont au moins un album est à (re)chercher : jamais cherché, ou cherché il y a plus de `days` jours.
// Pour chacun, TOUS ses albums du catalogue (pour bien répartir les versions), et ceux à mettre à jour.
async function artistsToCheck(days: number, limit: number) {
  const { rows } = await db.query<{ artist: string; albums: Array<{ id: string; title: string; due: boolean }> }>(
    `with due as (
       select id from albums
       where lastfm_checked_at is null or lastfm_checked_at < now() - make_interval(days => $1)
       order by lastfm_checked_at nulls first, lastfm_playcount desc nulls last
       limit $2
     )
     select a.artist, json_agg(json_build_object('id', a.id, 'title', a.title, 'due', a.id in (select id from due))) as albums
     from albums a
     where a.artist in (select artist from albums where id in (select id from due))
     group by a.artist
     order by max(a.lastfm_playcount) desc nulls last`,
    [days, limit],
  );
  return rows;
}

// Met à jour les écoutes Last.fm du catalogue. Une erreur définitive (clé refusée...) arrête tout ;
// relancer reprend là où on s'est arrêté, grâce à lastfm_checked_at.
export async function syncLastfm({ days = 30, max = Infinity, log = console.log, delayMs = LASTFM_DELAY_MS } = {}) {
  const artists = await artistsToCheck(days, Number.isFinite(max) ? max : 1_000_000);
  const total = artists.reduce((sum, item) => sum + item.albums.filter((album) => album.due).length, 0);
  log(`Last.fm : ${total} albums à vérifier (${artists.length} artistes).`);
  let checked = 0;
  let found = 0;

  for (const { artist, albums } of artists) {
    const variants = matchVariants(albums.map((album) => album.title), await fetchArtistTopAlbums(artist));
    await sleep(delayMs);

    for (const album of albums.filter((item) => item.due)) {
      const match = variants.get(album.title);
      let stats: LastfmStats | null;
      if (match) {
        stats = { playcount: match.playcount, listeners: null };
        if (match.playcount >= LISTENERS_MIN_PLAYCOUNT) {
          // Auditeurs de la version la plus écoutée, étendus au total dans la même proportion que les écoutes
          const top = await fetchLastfmAlbum(artist, match.top);
          await sleep(delayMs);
          if (top?.listeners && top.playcount > 0) stats.listeners = Math.round((top.listeners * match.playcount) / top.playcount);
        }
      } else {
        stats = await fetchLastfmAlbum(artist, album.title);
        await sleep(delayMs);
      }
      await saveLastfm(album.id, stats);
      checked++;
      if (stats) found++;
      if (checked % 200 === 0) log(`Last.fm : ${checked}/${total}, ${found} trouvés.`);
    }
  }
  log(`Last.fm terminé : ${found} albums sur ${checked} trouvés.`);
  return { checked, found };
}
