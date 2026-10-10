// Importe les albums dans la base, avec pochette, liens d'écoute et écoutes ListenBrainz.
//
//   npm run import:catalog                                  -> liste de test data/seed-albums.json
//   npm run import:catalog -- --seed autre.json             -> autre liste (artist, title)
//   npm run import:catalog -- --listenbrainz                -> albums les plus écoutés sur ListenBrainz
//                                                              (tous temps, année, semestre, trimestre, mois, semaine)
//   npm run import:catalog -- --listenbrainz --artists 300  -> en plus, les albums studio des 300 artistes les plus écoutés
//   npm run import:catalog -- --listens                     -> met seulement à jour les écoutes et la rareté
//
// Options : --min-listens 2000 (écoutes minimum d'un album pour entrer au catalogue), --max 500 (nombre maximum
// de nouveaux albums par lancement). Un album déjà présent n'est pas réimporté : relancer reprend où on s'est arrêté.
// Sources sans clé : ListenBrainz et MusicBrainz (une requête par seconde), Cover Art Archive, Deezer.
// Pochettes en panne après coup : npm run check:covers (scripts/check-covers.ts).

import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { existingMbids, recomputeRarity, saveListens, upsertAlbum } from "@/lib/catalog";
import { fetchPopularity, fetchTopArtists, fetchTopReleaseGroups, STAT_RANGES } from "@/lib/listenbrainz";
import { browseArtistAlbums, fetchCoverUrl, lookupReleaseGroups, searchReleaseGroup } from "@/lib/musicbrainz";
import { redis } from "@/lib/redis";
import { buildLinks, findDeezerCover } from "@/lib/streaming";

type Candidate = {
  mbid: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
};

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}
const hasFlag = (name: string) => process.argv.includes(name);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Liste écrite à la main : on cherche chaque album par son nom dans MusicBrainz
async function seedCandidates(seedPath: string): Promise<Candidate[]> {
  const entries = JSON.parse(await readFile(seedPath, "utf8")) as Array<{ artist: string; title: string }>;
  const candidates: Candidate[] = [];
  for (const [index, entry] of entries.entries()) {
    const match = await searchReleaseGroup(entry.artist, entry.title);
    if (match) candidates.push({ ...match, coverUrl: null });
    else console.log(`[${index + 1}/${entries.length}] ignoré, pas de correspondance fiable : ${entry.artist} — ${entry.title}`);
  }
  return candidates;
}

// Albums les plus écoutés sur ListenBrainz, toutes périodes confondues, puis discographies des artistes phares
async function listenbrainzCandidates(artistCount: number, known: Set<string>): Promise<Candidate[]> {
  const found = new Map<string, Candidate>();

  for (const range of STAT_RANGES) {
    const groups = await fetchTopReleaseGroups(range);
    for (const group of groups) {
      if (!found.has(group.mbid) && !known.has(group.mbid)) {
        found.set(group.mbid, { ...group, releaseYear: null });
      }
    }
    console.log(`ListenBrainz (${range}) : ${groups.length} albums, ${found.size} nouveaux au total.`);
  }

  // Le classement mélange albums, singles, live et bandes originales : on vérifie le type dans MusicBrainz
  const details = await lookupReleaseGroups([...found.keys()]);
  const studio = new Map(details.filter((info) => info.studioAlbum).map((info) => [info.mbid, info]));
  for (const [mbid, candidate] of found) {
    const info = studio.get(mbid);
    if (info) candidate.releaseYear = info.releaseYear;
    else found.delete(mbid);
  }
  console.log(`Albums studio retenus : ${found.size}.`);

  if (artistCount > 0) {
    const artists = await fetchTopArtists(artistCount);
    for (const [index, artist] of artists.entries()) {
      try {
        for (const album of await browseArtistAlbums(artist.mbid, artist.name)) {
          if (!found.has(album.mbid) && !known.has(album.mbid)) found.set(album.mbid, { ...album, coverUrl: null });
        }
      } catch (error) {
        console.log(`Artiste ignoré (${artist.name}) : ${(error as Error).message}`);
      }
      if ((index + 1) % 25 === 0) console.log(`Discographies : ${index + 1}/${artists.length} artistes, ${found.size} albums candidats.`);
    }
  }
  return [...found.values()];
}

async function importCandidate(candidate: Candidate, listens: { listens: number; listeners: number } | undefined) {
  // Pochette : celle de ListenBrainz, sinon Cover Art Archive, sinon Deezer
  const coverUrl =
    candidate.coverUrl ??
    (await fetchCoverUrl(candidate.mbid).catch(() => null)) ??
    (await findDeezerCover(candidate.artist, candidate.title));
  if (!coverUrl) return "pas de pochette";

  const links = await buildLinks(candidate.artist, candidate.title, []);
  await upsertAlbum({
    mbid: candidate.mbid,
    title: candidate.title,
    artist: candidate.artist,
    releaseYear: candidate.releaseYear,
    coverUrl,
    listens: listens?.listens ?? null,
    listeners: listens?.listeners ?? null,
    links,
  });
  return null;
}

// Écoutes à jour pour tout le catalogue, puis rareté recalculée
async function refreshListensAndRarity() {
  const { rows } = await db.query<{ mbid: string }>("select mbid from albums");
  const listens = await fetchPopularity(rows.map((row) => row.mbid));
  const updated = await saveListens(listens);
  const ranked = await recomputeRarity();
  const { rows: tiers } = await db.query<{ rarity_tier: string; n: string }>(
    "select rarity_tier, count(*) as n from albums group by rarity_tier order by count(*)",
  );
  console.log(`Écoutes mises à jour pour ${updated} albums, ${ranked} classés.`);
  console.log(`Raretés : ${tiers.map((tier) => `${tier.rarity_tier} ${tier.n}`).join(", ")}.`);
}

async function main() {
  if (hasFlag("--listens")) {
    await refreshListensAndRarity();
    return;
  }

  const minListens = Number(readOption("--min-listens") ?? 2000);
  const max = Number(readOption("--max") ?? Infinity);
  const known = await existingMbids();

  let candidates: Candidate[];
  if (hasFlag("--listenbrainz")) {
    candidates = await listenbrainzCandidates(Number(readOption("--artists") ?? 0), known);
  } else {
    candidates = await seedCandidates(readOption("--seed") ?? "data/seed-albums.json");
  }

  // Les écoutes servent à trier (les plus connus d'abord) et à écarter les sorties confidentielles
  const listens = await fetchPopularity(candidates.map((candidate) => candidate.mbid));
  const isSeed = !hasFlag("--listenbrainz");
  const selected = candidates
    .filter((candidate) => isSeed || (listens.get(candidate.mbid)?.listens ?? 0) >= minListens)
    .sort((a, b) => (listens.get(b.mbid)?.listens ?? 0) - (listens.get(a.mbid)?.listens ?? 0))
    .slice(0, max);
  console.log(`${selected.length} albums à importer${isSeed ? "" : ` (au moins ${minListens} écoutes)`}.`);

  let imported = 0;
  for (const [index, candidate] of selected.entries()) {
    const position = `[${index + 1}/${selected.length}]`;
    const label = `${candidate.artist} — ${candidate.title}`;
    try {
      const skipped = await importCandidate(candidate, listens.get(candidate.mbid));
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
  await refreshListensAndRarity();
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
