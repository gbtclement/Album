// Compte premium attribué à la main (pas encore de paiement).
//
//   npm run premium -- joueur@exemple.fr 30   -> 30 jours de premium de plus
//   npm run premium -- joueur@exemple.fr 0    -> retire le premium

import { db } from "@/lib/db";
import { setPremium } from "@/lib/premium";
import { redis } from "@/lib/redis";

async function main() {
  const [email, daysText] = process.argv.slice(2);
  if (!email || daysText === undefined) throw new Error("Usage : npm run premium -- <email> <jours>");
  const until = await setPremium(email, Number(daysText));
  console.log(until ? `${email} est premium jusqu'au ${until.toLocaleString("fr-FR")}.` : `${email} n'est plus premium.`);
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
