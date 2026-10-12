// Choix des albums à importer depuis Last.fm, sans base ni réseau (scripts/import-catalog.ts --lastfm).
// Last.fm dit ce que les gens écoutent ; MusicBrainz confirme qu'il s'agit d'un vrai album studio et donne son
// identifiant et son année. Un album entre au catalogue s'il est assez écouté sur Last.fm, toutes versions additionnées.

import { baseTitle, fullTitle, type LastfmAlbumEntry, matchVariants } from "@/lib/lastfm-variants";
import type { ReleaseGroupInfo } from "@/lib/musicbrainz";

export type LastfmArtist = { name: string; mbid: string | null };
export type AlbumGroup = { base: string; playcount: number };

// Albums d'un artiste sur Last.fm regroupés par titre de base (versions additionnées), assez écoutés, les plus écoutés d'abord.
// Sert à savoir, avant toute requête MusicBrainz, si l'artiste a quelque chose à nous apporter.
export function popularGroups(entries: LastfmAlbumEntry[], minPlays: number): AlbumGroup[] {
  const sums = new Map<string, number>();
  for (const entry of entries) {
    const base = baseTitle(entry.name);
    if (base && entry.playcount > 0) sums.set(base, (sums.get(base) ?? 0) + entry.playcount);
  }
  return [...sums]
    .filter(([, playcount]) => playcount >= minPlays)
    .map(([base, playcount]) => ({ base, playcount }))
    .sort((a, b) => b.playcount - a.playcount);
}

// Albums populaires de l'artiste qui ne sont pas encore au catalogue (comparés sur le titre de base)
export function missingGroups(groups: AlbumGroup[], catalogTitles: string[]) {
  const known = new Set(catalogTitles.map(baseTitle));
  return groups.filter((group) => !known.has(group.base));
}

// Classements Last.fm fusionnés : un artiste par nom (casse et accents ignorés), avec son identifiant MusicBrainz s'il est connu
export function mergeArtists(lists: Array<Array<{ name: string; mbid?: string | null }>>): LastfmArtist[] {
  const merged = new Map<string, LastfmArtist>();
  for (const list of lists) {
    for (const artist of list) {
      const key = fullTitle(artist.name);
      const current = merged.get(key);
      if (!current) merged.set(key, { name: artist.name, mbid: artist.mbid || null });
      else if (!current.mbid && artist.mbid) current.mbid = artist.mbid;
    }
  }
  return [...merged.values()];
}

// « Various Artists », « [unknown] » : pas un vrai artiste, sa discographie n'a pas de sens
export function isRealArtist(name: string) {
  const plain = fullTitle(name);
  return plain !== "" && !["various artists", "unknown", "va", "soundtrack"].includes(plain);
}

// Artistes MusicBrainz au nom identique (deux au plus, pour les homonymes : le premier dont la discographie
// correspond aux albums Last.fm l'emporte)
export function exactArtistMatches(name: string, results: Array<{ id: string; name: string; score: number }>) {
  const wanted = fullTitle(name);
  return results
    .filter((result) => result.score >= 90 && fullTitle(result.name) === wanted)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((result) => result.id);
}

// Albums studio MusicBrainz de l'artiste à importer : écoutés au moins `minPlays` fois sur Last.fm (versions
// additionnées) et absents du catalogue. Deux albums au même titre (Weezer...) : seulement le plus ancien.
export function selectNewAlbums(albums: ReleaseGroupInfo[], entries: LastfmAlbumEntry[], minPlays: number, known: Set<string>) {
  const byTitle = new Map<string, ReleaseGroupInfo>();
  for (const album of [...albums].sort((a, b) => (a.releaseYear ?? 9999) - (b.releaseYear ?? 9999))) {
    if (!byTitle.has(fullTitle(album.title))) byTitle.set(fullTitle(album.title), album);
  }
  const unique = [...byTitle.values()];
  const matches = matchVariants(unique.map((album) => album.title), entries);
  return unique.flatMap((album) => {
    const playcount = matches.get(album.title)?.playcount ?? 0;
    return playcount >= minPlays && !known.has(album.mbid) ? [{ ...album, playcount }] : [];
  });
}
