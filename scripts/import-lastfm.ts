// Récupère les écoutes Last.fm des albums du catalogue (affichées sur les fiches album, et base de la rareté).
//
//   npm run import:lastfm                -> albums jamais vérifiés, ou vérifiés il y a plus de 30 jours
//   npm run import:lastfm -- --days 0    -> tout le catalogue
//   npm run import:lastfm -- --max 200   -> 200 albums au plus (pour un essai)
//
// Il faut LASTFM_API_KEY dans .env (clé gratuite : https://www.last.fm/api/account/create).
// Une requête par artiste (toutes ses versions d'albums), plus une par gros album : environ une heure pour 13 000 albums.
// Relancer reprend où on s'est arrêté. À la fin, la rareté de tout le catalogue est recalculée.

import { recomputeRarity } from "@/lib/catalog";
import { db } from "@/lib/db";
import { lastfmKey, syncLastfm } from "@/lib/lastfm";

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main() {
  if (!lastfmKey()) {
    console.error("LASTFM_API_KEY manquant dans .env : crée une clé sur https://www.last.fm/api/account/create");
    process.exitCode = 1;
    return;
  }
  await syncLastfm({
    days: Number(readOption("--days") ?? 30),
    max: Number(readOption("--max") ?? Infinity),
  });
  // La rareté se calcule sur ces écoutes : on la met à jour tout de suite
  await recomputeRarity();
  console.log("Raretés recalculées.");
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
