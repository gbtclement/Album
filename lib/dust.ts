import { db, withTransaction } from "@/lib/db";
import { craftCost, DUST_PER_DUPLICATE, pressableCopies } from "@/lib/dust-rules";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";

// Poussière de vinyle (lot DUP1) : les doublons se pressent en poussière, la poussière fabrique l'album de son choix.

export class DustError extends Error {}

// Exemplaires engagés ailleurs : annonces actives du marché et propositions d'échange en attente où le joueur offre l'album
export const RESERVED_SQL = `(
  (select count(*) from listings l where l.seller_id = ua.user_id and l.album_id = ua.album_id and l.status = 'active')
  + (select count(*) from trades t where t.proposer_id = ua.user_id and t.offer_album_id = ua.album_id and t.status = 'pending')
)::int`;

export async function getDust(userId: string) {
  const { rows } = await db.query<{ dust: number }>("select dust from users where id = $1", [userId]);
  return rows[0]?.dust ?? 0;
}

export type PressResult = { cards: number; dust: number };

// Presse les doublons d'un album (slug), ou de toutes les raretés choisies. Toujours un exemplaire gardé.
export async function pressDuplicates(userId: string, target: { slug: string } | { tiers: RarityTier[] }): Promise<PressResult> {
  const tiers = "tiers" in target ? target.tiers.filter((tier) => RARITY_TIERS.includes(tier)) : null;
  if (tiers && tiers.length === 0) throw new DustError("Choisis au moins une rareté.");

  return withTransaction(async (client) => {
    // Verrou sur les lignes de collection : une annonce ou un échange créé en même temps attend la fin du pressage
    const { rows } = await client.query<{ album_id: string; rarity_tier: RarityTier; count: number; reserved: number }>(
      `select ua.album_id, a.rarity_tier, ua.count, ${RESERVED_SQL} as reserved
       from user_albums ua join albums a on a.id = ua.album_id
       where ua.user_id = $1 and ua.count > 1
         and ($2::text is null or a.slug = $2)
         and ($3::text[] is null or a.rarity_tier = any($3))
       for update of ua`,
      [userId, "slug" in target ? target.slug : null, tiers],
    );

    let cards = 0;
    let dust = 0;
    for (const row of rows) {
      const pressed = pressableCopies(row.count, row.reserved);
      if (pressed === 0) continue;
      await client.query("update user_albums set count = count - $3 where user_id = $1 and album_id = $2", [userId, row.album_id, pressed]);
      cards += pressed;
      dust += pressed * DUST_PER_DUPLICATE[row.rarity_tier];
    }
    if (cards === 0) {
      throw new DustError("slug" in target ? "Aucun doublon libre de cet album (un exemplaire est toujours gardé, ceux en vente ou en échange aussi)." : "Aucun doublon à presser.");
    }
    await client.query("update users set dust = dust + $2 where id = $1", [userId, dust]);
    return { cards, dust };
  });
}

// Doublons pressables par rareté, pour l'aperçu de la collection
export async function getPressableSummary(userId: string): Promise<Record<RarityTier, { cards: number; dust: number }>> {
  const { rows } = await db.query<{ rarity_tier: RarityTier; count: number; reserved: number }>(
    `select a.rarity_tier, ua.count, ${RESERVED_SQL} as reserved
     from user_albums ua join albums a on a.id = ua.album_id
     where ua.user_id = $1 and ua.count > 1`,
    [userId],
  );
  const summary = Object.fromEntries(RARITY_TIERS.map((tier) => [tier, { cards: 0, dust: 0 }])) as Record<RarityTier, { cards: number; dust: number }>;
  for (const row of rows) {
    const pressed = pressableCopies(row.count, row.reserved);
    summary[row.rarity_tier].cards += pressed;
    summary[row.rarity_tier].dust += pressed * DUST_PER_DUPLICATE[row.rarity_tier];
  }
  return summary;
}

// Fabrique un album absent de la collection avec de la poussière. Ni XP, ni points de saison, ni quête :
// comme un achat au marché, seules les cartes ouvertes en pack ou trouvées à la pioche en rapportent.
export async function craftAlbum(userId: string, slug: string) {
  return withTransaction(async (client) => {
    const album = await client.query<{ id: string; title: string; rarity_tier: RarityTier }>(
      "select id, title, rarity_tier from albums where slug = $1",
      [slug],
    );
    if (!album.rows[0]) throw new DustError("Album introuvable.");
    const { id, title, rarity_tier } = album.rows[0];
    const cost = craftCost(rarity_tier);

    // Verrou sur le joueur : deux fabrications simultanées ne dépensent pas deux fois la même poussière
    const balance = await client.query<{ dust: number }>("select dust from users where id = $1 for update", [userId]);
    const owned = await client.query("select 1 from user_albums where user_id = $1 and album_id = $2 and count > 0", [userId, id]);
    if (owned.rowCount) throw new DustError("Cet album est déjà dans ta collection.");
    if ((balance.rows[0]?.dust ?? 0) < cost) throw new DustError(`Il te faut ${cost.toLocaleString("fr-FR")} poussières pour fabriquer cet album.`);

    await client.query("update users set dust = dust - $2 where id = $1", [userId, cost]);
    await client.query("insert into user_albums (user_id, album_id, count) values ($1, $2, 1)", [userId, id]);
    await client.query("insert into crafts (user_id, album_id, cost) values ($1, $2, $3)", [userId, id, cost]);
    return { title, cost };
  });
}
