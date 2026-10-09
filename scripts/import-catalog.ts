// Importe les albums dans la base, avec pochette, liens d'écoute et écoutes Last.fm.
//
//   npm run import:catalog                       -> liste de test data/seed-albums.json
//   npm run import:catalog -- --seed autre.json  -> autre liste (artist, title)
//   npm run import:catalog -- --lastfm 3000      -> les 3000 albums les plus écoutés (clé Last.fm requise)
//
// MusicBrainz limite à une requête par seconde : compter environ 2 secondes par album.

import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { recomputeRarity, upsertAlbum } from "@/lib/catalog";
import { fetchLastfmTopAlbums, lastfmEnabled } from "@/lib/lastfm";
import { fetchCoverUrl, lookupReleaseGroupUrls, searchReleaseGroup } from "@/lib/musicbrainz";
import { redis } from "@/lib/redis";
import { buildLinks } from "@/lib/streaming";

type Candidate = {
  artist: string;
  title: string;
  playcount: number | null;
  listeners: number | null;
};

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function loadCandidates(): Promise<Candidate[]> {
  const lastfmCount = readOption("--lastfm");
  if (lastfmCount) {
    const albums = await fetchLastfmTopAlbums(Number(lastfmCount));
    return albums.map((album) => ({
      artist: album.artist,
      title: album.title,
      playcount: album.playcount,
      listeners: album.listeners,
    }));
  }

  const seedPath = readOption("--seed") ?? "data/seed-albums.json";
  const entries = JSON.parse(await readFile(seedPath, "utf8")) as Array<{ artist: string; title: string }>;
  return entries.map((entry) => ({ ...entry, playcount: null, listeners: null }));
}

async function importCandidate(candidate: Candidate, position: string): Promise<boolean> {
  const label = `${candidate.artist} — ${candidate.title}`;

  const match = await searchReleaseGroup(candidate.artist, candidate.title);
  if (!match) {
    console.log(`${position} ignoré, pas de correspondance fiable : ${label}`);
    return false;
  }

  const coverUrl = await fetchCoverUrl(match.mbid);
  if (!coverUrl) {
    console.log(`${position} ignoré, pas de pochette : ${label}`);
    return false;
  }

  const urls = await lookupReleaseGroupUrls(match.mbid);
  const links = await buildLinks(match.artist, match.title, urls);

  await upsertAlbum({
    mbid: match.mbid,
    title: match.title,
    artist: match.artist,
    releaseYear: match.releaseYear,
    coverUrl,
    playcount: candidate.playcount,
    listeners: candidate.listeners,
    links,
  });
  console.log(`${position} importé : ${label}`);
  return true;
}

async function main() {
  if (readOption("--lastfm") && !lastfmEnabled()) {
    throw new Error("LASTFM_API_KEY n'est pas renseignée dans .env");
  }

  const candidates = await loadCandidates();
  console.log(`${candidates.length} albums à traiter.`);

  let imported = 0;
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const position = `[${index + 1}/${candidates.length}]`;
    try {
      if (await importCandidate(candidate, position)) imported++;
    } catch (error) {
      // Une erreur sur un album ne doit pas arrêter tout l'import
      console.log(`${position} erreur : ${candidate.artist} — ${candidate.title} (${(error as Error).message})`);
    }
  }

  const ranked = await recomputeRarity();
  console.log(`Terminé : ${imported} albums importés. ${ranked} albums classés par écoutes Last.fm.`);
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
