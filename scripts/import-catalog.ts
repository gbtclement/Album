// Importe les albums dans la base, avec pochette et liens d'écoute.
//
//   npm run import:catalog                                -> liste de test data/seed-albums.json
//   npm run import:catalog -- --seed autre.json           -> autre liste (artist, title)
//   npm run import:catalog -- --lastfm                    -> albums des artistes les plus écoutés sur Last.fm :
//                                                            classement mondial, par pays et par genre
//   npm run import:catalog -- --lastfm --max-artists 50   -> essai sur 50 artistes
//   ... --dry-run                                         -> montre les albums qui seraient importés, sans rien écrire
//   ... --save-candidates albums.json                     -> enregistre la liste des albums repérés (avec --dry-run :
//                                                            parcours seul, l'import se fera plus tard)
//   npm run import:catalog -- --candidates albums.json    -> importe une liste enregistrée, sans refaire le parcours
//
// Options de --lastfm : --top 10000 (artistes du classement mondial), --per-country 1000, --per-tag 500,
// --countries "France,Japan" et --tags "french rap,k-pop" (remplacent les listes par défaut ci-dessous),
// --min-plays 100000 (écoutes Last.fm minimum, toutes versions additionnées), --max 500 (nouveaux albums au plus).
// Un album déjà présent n'est pas réimporté : relancer reprend où on s'est arrêté (discographies en cache une semaine).
//
// Sources : Last.fm (clé LASTFM_API_KEY dans .env) dit ce que les gens écoutent ; MusicBrainz (sans clé, une requête
// par seconde) confirme qu'il s'agit d'un album studio et donne son identifiant et son année ; pochettes Cover Art
// Archive ou Deezer. Pochettes en panne après coup : npm run check:covers (scripts/check-covers.ts).
// À la fin : écoutes Last.fm des nouveaux albums (scripts/import-lastfm.ts), rareté, photos des nouveaux artistes.

import { readFile, writeFile } from "node:fs/promises";
import { syncArtistPhotos } from "@/lib/artist-photos";
import { catalogTitlesByArtist, existingMbids, recomputeRarity, upsertAlbum } from "@/lib/catalog";
import { db } from "@/lib/db";
import {
  type Candidate,
  exactArtistMatches,
  isRealArtist,
  type LastfmArtist,
  mergeArtists,
  missingGroups,
  parseCandidates,
  popularGroups,
  selectNewAlbums,
} from "@/lib/lastfm-discovery-rules";
import { type ArtistChart, fetchArtistTopAlbums, fetchLastfmArtists, LASTFM_DELAY_MS, lastfmKey, syncLastfm } from "@/lib/lastfm";
import { fullTitle, type LastfmAlbumEntry } from "@/lib/lastfm-variants";
import { browseArtistAlbums, fetchCoverUrl, searchArtists, searchReleaseGroup } from "@/lib/musicbrainz";
import { redis } from "@/lib/redis";
import { buildLinks, findDeezerCover } from "@/lib/streaming";

// Pays (noms anglais de Last.fm) et genres parcourus par défaut : de quoi compléter le classement mondial,
// dominé par la pop et le rock anglo-saxons
const COUNTRIES = ["France", "Belgium", "Switzerland", "Canada", "United States", "United Kingdom", "Germany", "Spain", "Italy", "Brazil", "Mexico", "Japan", "Korea, Republic of"];
const TAGS = [
  "french rap", "french", "chanson francaise", "variete francaise", "rap", "hip-hop", "rnb", "soul", "funk", "disco",
  "pop", "k-pop", "j-pop", "latin", "reggaeton", "afrobeats", "rock", "classic rock", "hard rock", "alternative",
  "indie", "punk", "metal", "electronic", "house", "techno", "jazz", "blues", "reggae", "country", "folk",
];

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}
const hasFlag = (name: string) => process.argv.includes(name);
const listOption = (name: string, fallback: string[]) => readOption(name)?.split(",").map((item) => item.trim()).filter(Boolean) ?? fallback;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Erreur due à une coupure de connexion (après les nouvelles tentatives de lib/lastfm.ts et lib/musicbrainz.ts)
const isOffline = (error: unknown) => /injoignable|fetch failed/.test((error as Error)?.message ?? "");
const OFFLINE_WAITS = 60;

// Liste écrite à la main : on cherche chaque album par son nom dans MusicBrainz
async function seedCandidates(seedPath: string): Promise<Candidate[]> {
  const entries = JSON.parse(await readFile(seedPath, "utf8")) as Array<{ artist: string; title: string }>;
  const candidates: Candidate[] = [];
  for (const [index, entry] of entries.entries()) {
    const match = await searchReleaseGroup(entry.artist, entry.title);
    if (match) candidates.push({ ...match, playcount: 0 });
    else console.log(`[${index + 1}/${entries.length}] ignoré, pas de correspondance fiable : ${entry.artist} — ${entry.title}`);
  }
  return candidates;
}

// Artistes des classements Last.fm : mondial, puis par pays et par genre
async function artistPool(): Promise<LastfmArtist[]> {
  const sources: Array<[string, ArtistChart, number]> = [
    ["monde", { chart: true }, Number(readOption("--top") ?? 10_000)],
    ...listOption("--countries", COUNTRIES).map((country): [string, ArtistChart, number] => [country, { country }, Number(readOption("--per-country") ?? 1000)]),
    ...listOption("--tags", TAGS).map((tag): [string, ArtistChart, number] => [tag, { tag }, Number(readOption("--per-tag") ?? 500)]),
  ];
  const lists = [];
  for (const [label, source, count] of sources) {
    const list = await fetchLastfmArtists(source, count);
    lists.push(list);
    console.log(`Last.fm (${label}) : ${list.length} artistes, ${mergeArtists(lists).length} au total.`);
  }
  const pool = mergeArtists(lists).filter((artist) => isRealArtist(artist.name));
  const maxArtists = Number(readOption("--max-artists") ?? Infinity);
  return pool.slice(0, maxArtists);
}

// Albums studio de l'artiste sur MusicBrainz qui correspondent à ses albums Last.fm. On essaie d'abord l'identifiant
// donné par Last.fm, puis les artistes MusicBrainz du même nom (homonymes) : le premier qui correspond l'emporte.
async function studioAlbumsFor(artist: LastfmArtist, entries: LastfmAlbumEntry[], minPlays: number, known: Set<string>) {
  const tried = new Set<string>();
  const attempt = async (mbid: string) => {
    tried.add(mbid);
    // Identifiant inconnu de MusicBrainz : pas d'albums ; connexion coupée : l'erreur remonte (on attendra le réseau)
    const albums = await browseArtistAlbums(mbid, artist.name).catch((error: Error) => {
      if (isOffline(error)) throw error;
      return [];
    });
    // Correspondance sans tenir compte du catalogue : c'est bien le bon artiste, même si on a déjà tout
    return selectNewAlbums(albums, entries, minPlays, new Set()).length > 0 ? selectNewAlbums(albums, entries, minPlays, known) : null;
  };

  if (artist.mbid) {
    const found = await attempt(artist.mbid);
    if (found) return found;
  }
  for (const mbid of exactArtistMatches(artist.name, await searchArtists(artist.name))) {
    if (tried.has(mbid)) continue;
    const found = await attempt(mbid);
    if (found) return found;
  }
  return [];
}

async function lastfmCandidates(known: Set<string>): Promise<Candidate[]> {
  const minPlays = Number(readOption("--min-plays") ?? 100_000);
  const pool = await artistPool();
  const catalog = await catalogTitlesByArtist(fullTitle);
  console.log(`${pool.length} artistes à parcourir (albums d'au moins ${minPlays.toLocaleString("fr-FR")} écoutes Last.fm).`);

  const found = new Map<string, Candidate>();
  let checked = 0;
  for (const [index, artist] of pool.entries()) {
    for (let attempt = 1; ; attempt++) {
      try {
        const entries = await fetchArtistTopAlbums(artist.name);
        await sleep(LASTFM_DELAY_MS);
        // Rien d'assez écouté qui manque au catalogue : inutile de demander sa discographie à MusicBrainz
        const ownTitles = catalog.get(fullTitle(artist.name)) ?? [];
        if (missingGroups(popularGroups(entries, minPlays), ownTitles).length > 0) {
          checked++;
          const owned = new Set(ownTitles.map(fullTitle));
          for (const album of await studioAlbumsFor(artist, entries, minPlays, known)) {
            // Même titre qu'un album déjà au catalogue (autre fiche MusicBrainz du même disque) : on n'en veut pas deux
            if (!found.has(album.mbid) && !owned.has(fullTitle(album.title))) found.set(album.mbid, album);
          }
        }
        break;
      } catch (error) {
        // Connexion coupée : on attend qu'elle revienne (une heure au plus) au lieu de perdre l'artiste
        if (isOffline(error) && attempt < OFFLINE_WAITS) {
          if (attempt === 1) console.log(`Connexion coupée (${artist.name}) : nouvel essai chaque minute.`);
          await sleep(60_000);
          continue;
        }
        console.log(`Artiste ignoré (${artist.name}) : ${(error as Error).message}`);
        break;
      }
    }
    if ((index + 1) % 200 === 0) {
      console.log(`Artistes : ${index + 1}/${pool.length}, ${checked} discographies vérifiées, ${found.size} albums à importer.`);
    }
  }
  return [...found.values()];
}

async function importCandidate(candidate: Candidate) {
  // Pochette : l'image principale sur Cover Art Archive, sinon celle de Deezer
  const coverUrl = (await fetchCoverUrl(candidate.mbid).catch(() => null)) ?? (await findDeezerCover(candidate.artist, candidate.title));
  if (!coverUrl) return "pas de pochette";

  const links = await buildLinks(candidate.artist, candidate.title, []);
  await upsertAlbum({
    mbid: candidate.mbid,
    title: candidate.title,
    artist: candidate.artist,
    releaseYear: candidate.releaseYear,
    coverUrl,
    links,
  });
  return null;
}

async function main() {
  const fromLastfm = hasFlag("--lastfm");
  if (fromLastfm && !lastfmKey()) {
    console.error("LASTFM_API_KEY manquant dans .env : crée une clé sur https://www.last.fm/api/account/create");
    process.exitCode = 1;
    return;
  }
  const max = Number(readOption("--max") ?? Infinity);
  const known = await existingMbids();
  const savedList = readOption("--candidates");
  const candidates = savedList
    ? parseCandidates(await readFile(savedList, "utf8"))
    : fromLastfm
      ? await lastfmCandidates(known)
      : await seedCandidates(readOption("--seed") ?? "data/seed-albums.json");

  // Les plus écoutés d'abord : si l'import s'arrête en route, l'essentiel est là
  const selected = candidates
    .filter((candidate) => !known.has(candidate.mbid))
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, max);
  console.log(`${selected.length} albums à importer.`);
  // Liste enregistrée : l'import peut se faire plus tard, ou sur un autre ordinateur (--candidates)
  const saveTo = readOption("--save-candidates");
  if (saveTo) {
    const list: Candidate[] = selected.map(({ mbid, title, artist, releaseYear, playcount }) => ({ mbid, title, artist, releaseYear, playcount }));
    await writeFile(saveTo, JSON.stringify(list, null, 1));
    console.log(`Liste enregistrée dans ${saveTo}.`);
  }
  // Essai à blanc : on montre ce qui serait importé, sans rien écrire
  if (hasFlag("--dry-run")) {
    for (const candidate of saveTo ? [] : selected) console.log(`  ${candidate.artist} — ${candidate.title} (${candidate.releaseYear ?? "?"}, ${candidate.playcount.toLocaleString("fr-FR")} écoutes)`);
    return;
  }

  let imported = 0;
  for (const [index, candidate] of selected.entries()) {
    const position = `[${index + 1}/${selected.length}]`;
    const label = `${candidate.artist} — ${candidate.title}`;
    try {
      const skipped = await importCandidate(candidate);
      if (skipped) console.log(`${position} ignoré, ${skipped} : ${label}`);
      else {
        imported++;
        console.log(`${position} importé : ${label}`);
      }
    } catch (error) {
      // Une erreur sur un album ne doit pas arrêter tout l'import
      console.log(`${position} erreur : ${label} (${(error as Error).message})`);
    }
    // Deezer limite à 50 requêtes toutes les 5 secondes
    await sleep(120);
  }

  console.log(`Terminé : ${imported} albums importés.`);
  // Écoutes Last.fm des nouveaux albums (fiches album et rareté), si la clé est configurée, puis rareté recalculée
  if (lastfmKey()) await syncLastfm();
  else console.log("Écoutes Last.fm non récupérées : ajoute LASTFM_API_KEY dans .env puis lance npm run import:lastfm.");
  await recomputeRarity();
  const { rows: tiers } = await db.query<{ rarity_tier: string; n: string }>(
    "select rarity_tier, count(*) as n from albums group by rarity_tier order by count(*)",
  );
  console.log(`Raretés : ${tiers.map((tier) => `${tier.rarity_tier} ${tier.n}`).join(", ")}.`);
  // Photos des nouveaux artistes (onglet Artistes de la collection)
  await syncArtistPhotos();
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
    redis.disconnect();
  });
