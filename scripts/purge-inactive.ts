// Comptes inactifs (RGPD : ne pas garder les données sans raison). À lancer une fois par jour en production.
//
//   npm run purge:inactive              -> prévient par e-mail les joueurs absents depuis 3 ans moins 30 jours,
//                                          supprime ceux toujours absents 30 jours après l'e-mail,
//                                          efface les liens de vérification et de mot de passe expirés
//   npm run purge:inactive -- --dry-run -> compte seulement, sans rien envoyer ni supprimer

import { purgeInactiveAccounts } from "@/lib/account";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

async function main() {
  const { notified, deleted } = await purgeInactiveAccounts({ dryRun: process.argv.includes("--dry-run") });
  console.log(`Terminé : ${notified} e-mail(s) envoyé(s), ${deleted} compte(s) supprimé(s).`);
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
