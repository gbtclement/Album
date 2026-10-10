import { db } from "@/lib/db";
import { getPackState } from "@/lib/packs";
import { getQuestStatus } from "@/lib/quests";

// Données de la barre d'infos (haut) et des pastilles de la barre de jeu (bas), pour le joueur connecté
export type HudData = {
  coins: number;
  cards: number;
  stock: number;
  nextPackAt: string | null;
  questsReady: number;
  social: number;
};

export async function getHudData(userId: string): Promise<HudData> {
  const [user, pack, quests, social] = await Promise.all([
    db.query<{ coins: number; cards: number }>(
      `select u.coins, coalesce((select sum(count) from user_albums where user_id = u.id), 0)::int as cards
       from users u where u.id = $1`,
      [userId],
    ),
    getPackState(userId),
    getQuestStatus(userId),
    // Pastille Social : demandes d'ami et propositions d'échange en attente de ma réponse
    db.query<{ total: number }>(
      `select ((select count(*) from friendships where addressee_id = $1 and status = 'pending')
             + (select count(*) from trades where receiver_id = $1 and status = 'pending'))::int as total`,
      [userId],
    ),
  ]);

  return {
    coins: user.rows[0]?.coins ?? 0,
    cards: user.rows[0]?.cards ?? 0,
    stock: pack.stock,
    nextPackAt: pack.nextPackAt ? pack.nextPackAt.toISOString() : null,
    questsReady: quests.filter((quest) => !quest.claimed && quest.progress >= quest.target).length,
    social: social.rows[0]?.total ?? 0,
  };
}
