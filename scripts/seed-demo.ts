// Données de démonstration pour le développement : joueurs, collections, amis, marché, bourse, échanges, quêtes.
//
//   npm run seed:demo
//
// Compte principal : demo@demo.invalid, mot de passe "demo-album" (8 autres joueurs : lea, max, nora...).
// Relancer le script efface puis recrée ces comptes (e-mails en @demo.invalid) : les vrais comptes ne sont pas touchés.
// Refuse de tourner en production.

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { MAX_STOCK, PACK_RATES } from "@/lib/pack-rules";
import { periodStart, QUESTS } from "@/lib/quests";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { redis } from "@/lib/redis";

const DEMO_DOMAIN = "demo.invalid";
const PASSWORD = "demo-album";
// Prix de base d'une carte par rareté, pour les annonces et l'historique de la bourse
const BASE_PRICE: Record<RarityTier, number> = { commun: 28, peu_commun: 70, rare: 190, epique: 520, legendaire: 2200 };

const PLAYERS = [
  { pseudo: "demo", cards: 70, coins: 2500 },
  { pseudo: "lea", cards: 220, coins: 4200 },
  { pseudo: "ines", cards: 190, coins: 3100 },
  { pseudo: "max", cards: 140, coins: 1800 },
  { pseudo: "nora", cards: 95, coins: 1200 },
  { pseudo: "sam", cards: 80, coins: 900 },
  { pseudo: "jules", cards: 65, coins: 1500 },
  { pseudo: "theo", cards: 40, coins: 700 },
  { pseudo: "emma", cards: 30, coins: 600 },
];

const random = (max: number) => Math.floor(Math.random() * max);
const pick = <T>(items: T[]) => items[random(items.length)];

function drawTier(): RarityTier {
  let roll = Math.random();
  for (const tier of RARITY_TIERS) {
    roll -= PACK_RATES[tier];
    if (roll < 0) return tier;
  }
  return "commun";
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Données de démonstration refusées en production.");

  const { rows: albums } = await db.query<{ id: string; rarity_tier: RarityTier }>(
    "select id, rarity_tier from albums where cover_url is not null",
  );
  if (albums.length === 0) throw new Error("Catalogue vide : lance d'abord npm run import:catalog.");
  const byTier = Object.fromEntries(RARITY_TIERS.map((tier) => [tier, albums.filter((album) => album.rarity_tier === tier)])) as Record<RarityTier, typeof albums>;
  const tierOf = new Map(albums.map((album) => [album.id, album.rarity_tier]));
  const drawAlbum = () => {
    const pool = byTier[drawTier()];
    return (pool.length ? pick(pool) : pick(albums)).id;
  };

  await db.query("delete from users where email like $1", [`%@${DEMO_DOMAIN}`]);
  const hash = await bcrypt.hash(PASSWORD, 10);

  // Joueurs et collections (tirées avec les vrais taux des packs)
  const ids: Record<string, string> = {};
  const owned: Record<string, Map<string, number>> = {};
  for (const player of PLAYERS) {
    const { rows } = await db.query<{ id: string }>(
      `insert into users (email, pseudo, password_hash, coins, email_verified_at, created_at)
       values ($1, $2, $3, $4, now(), now() - make_interval(days => $5)) returning id`,
      [`${player.pseudo}@${DEMO_DOMAIN}`, player.pseudo, hash, player.coins, 20 + random(200)],
    );
    const id = rows[0].id;
    ids[player.pseudo] = id;
    const counts = new Map<string, number>();
    for (let i = 0; i < player.cards; i++) {
      const albumId = drawAlbum();
      counts.set(albumId, (counts.get(albumId) ?? 0) + 1);
    }
    owned[player.pseudo] = counts;
    for (const [albumId, count] of counts) {
      await db.query(
        "insert into user_albums (user_id, album_id, count, first_obtained_at) values ($1, $2, $3, now() - make_interval(hours => $4))",
        [id, albumId, count, random(24 * 60)],
      );
    }
    await db.query("insert into pack_stocks (user_id, stock) values ($1, $2)", [id, player.pseudo === "demo" ? MAX_STOCK : 3]);
  }
  const ownedBy = (pseudo: string) => [...owned[pseudo].keys()];
  const notOwnedBy = (pseudo: string, from: string) => ownedBy(from).filter((albumId) => !owned[pseudo].has(albumId));

  // Amis : 3 amis, une demande reçue (sam), une demande envoyée (theo)
  for (const friend of ["lea", "max", "nora"]) {
    await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'accepted')", [ids.demo, ids[friend]]);
  }
  await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'pending')", [ids.sam, ids.demo]);
  await db.query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'pending')", [ids.demo, ids.theo]);

  // Historique de la bourse : des ventes sur 30 jours pour une quarantaine d'albums
  const traded = [...new Set(PLAYERS.slice(1).flatMap((player) => ownedBy(player.pseudo)))].slice(0, 40);
  for (const albumId of traded) {
    const base = BASE_PRICE[tierOf.get(albumId)!];
    let price = base * (0.8 + Math.random() * 0.4);
    const trend = (Math.random() - 0.45) * 0.03;
    for (let day = 29; day >= 0; day--) {
      if (Math.random() < 0.45) continue;
      price = Math.max(1, price * (1 + trend + (Math.random() - 0.5) * 0.08));
      await db.query("insert into market_sales (album_id, price_coins, created_at) values ($1, $2, now() - make_interval(days => $3, hours => $4))", [
        albumId,
        Math.round(price),
        day,
        random(20),
      ]);
    }
  }

  // Annonces : ventes en pièces, et quelques trocs demandant un album que demo possède
  const sellers = ["lea", "ines", "max", "nora", "sam", "jules", "emma"];
  for (let i = 0; i < 18; i++) {
    const seller = sellers[i % sellers.length];
    const albumId = pick(ownedBy(seller));
    const price = Math.round(BASE_PRICE[tierOf.get(albumId)!] * (0.8 + Math.random() * 0.5));
    await db.query("insert into listings (seller_id, album_id, price_coins, created_at) values ($1, $2, $3, now() - make_interval(mins => $4))", [
      ids[seller],
      albumId,
      price,
      random(5000),
    ]);
  }
  for (const seller of ["ines", "jules", "lea"]) {
    const albumId = pick(notOwnedBy("demo", seller));
    await db.query("insert into listings (seller_id, album_id, wanted_album_id) values ($1, $2, $3)", [ids[seller], albumId, pick(ownedBy("demo"))]);
  }
  // Une annonce de demo
  await db.query("insert into listings (seller_id, album_id, price_coins) values ($1, $2, $3)", [ids.demo, pick(ownedBy("demo")), 45]);

  // Échanges : deux propositions reçues, une envoyée
  await db.query("insert into trades (proposer_id, receiver_id, offer_album_id, request_album_id) values ($1, $2, $3, $4)", [
    ids.lea,
    ids.demo,
    pick(notOwnedBy("demo", "lea")),
    pick(ownedBy("demo")),
  ]);
  await db.query("insert into trades (proposer_id, receiver_id, offer_coins, request_album_id) values ($1, $2, 150, $3)", [ids.nora, ids.demo, pick(ownedBy("demo"))]);
  await db.query("insert into trades (proposer_id, receiver_id, offer_album_id, request_coins) values ($1, $2, $3, 80)", [ids.demo, ids.max, pick(ownedBy("demo"))]);

  // Quêtes de demo : une récompense prête, d'autres en cours
  const progress: Record<string, number> = { daily_packs: 3, daily_new: 1, weekly_packs: 8, weekly_rare: 3, weekly_trade: 1, monthly_new: 12 };
  for (const quest of QUESTS) {
    if (progress[quest.key] === undefined) continue;
    await db.query("insert into user_quests (user_id, quest_key, period_start, progress) values ($1, $2, $3, $4)", [
      ids.demo,
      quest.key,
      periodStart(quest.period),
      Math.min(progress[quest.key], quest.target),
    ]);
  }

  // Le classement est mis en cache 5 minutes : on le vide pour voir tout de suite les nouveaux joueurs
  const keys = await redis.keys("leaderboard:*");
  if (keys.length) await redis.del(...keys);

  console.log(`Démo prête : ${PLAYERS.length} joueurs, ${traded.length} albums cotés en bourse.`);
  console.log(`Connexion : demo@${DEMO_DOMAIN} / ${PASSWORD}`);
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
