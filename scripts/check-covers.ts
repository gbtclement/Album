// Vérifie que la pochette de chaque album s'affiche encore, et remplace celles qui ne répondent plus.
//
//   npm run check:covers                -> tout le catalogue
//   npm run check:covers -- --max 200   -> seulement les 200 premiers albums (pour un essai)
//
// Remplaçante : image principale de l'album sur Cover Art Archive, sinon pochette Deezer.
// Sans remplaçante, l'album garde son adresse : le site affiche alors un vinyle avec le titre.

import { coverWorks, findReplacementCover } from "@/lib/covers";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

type Row = { id: string; mbid: string; artist: string; title: string; cover_url: string | null };

// Plusieurs vérifications en parallèle, sans inonder les serveurs d'images
const PARALLEL = 6;

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main() {
  const max = Number(readOption("--max") ?? Infinity);
  const { rows } = await db.query<Row>("select id, mbid, artist, title, cover_url from albums order by listener_count desc nulls last, id");
  const albums = rows.slice(0, max);

  const broken: Row[] = [];
  let checked = 0;
  let next = 0;
  async function worker() {
    while (next < albums.length) {
      const album = albums[next++];
      if (!album.cover_url || !(await coverWorks(album.cover_url))) broken.push(album);
      if (++checked % 200 === 0) console.log(`Vérifiées : ${checked}/${albums.length}, en panne : ${broken.length}.`);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log(`${albums.length} pochettes vérifiées, ${broken.length} ne s'affichent pas.`);

  let fixed = 0;
  for (const album of broken) {
    const replacement = await findReplacementCover(album);
    const label = `${album.artist} — ${album.title}`;
    if (!replacement) {
      console.log(`Sans remplaçante : ${label}`);
      continue;
    }
    await db.query("update albums set cover_url = $1, updated_at = now() where id = $2", [replacement, album.id]);
    fixed++;
    console.log(`Remplacée : ${label}`);
  }
  console.log(`Terminé : ${fixed} pochettes remplacées, ${broken.length - fixed} sans remplaçante.`);
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
