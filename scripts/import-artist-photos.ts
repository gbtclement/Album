// Récupère les photos des artistes du catalogue sur Deezer (onglet Artistes de la collection).
//
//   npm run import:photos                -> artistes jamais cherchés, ou cherchés sans résultat il y a plus de 30 jours
//   npm run import:photos -- --days 0    -> recherche à nouveau tous les artistes sans photo
//   npm run import:photos -- --max 50    -> 50 artistes au plus (pour un essai)
//
// Sans clé. Environ 2 artistes par seconde : une quinzaine de minutes pour 1 500 artistes. Relancer reprend où on s'est arrêté.

import { syncArtistPhotos } from "@/lib/artist-photos";
import { db } from "@/lib/db";

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

syncArtistPhotos({
  days: Number(readOption("--days") ?? 30),
  max: Number(readOption("--max") ?? Infinity),
})
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
