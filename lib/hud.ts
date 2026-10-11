import { syncAchievements, takeAchievementNotices } from "@/lib/achievements";
import { countClaimableSets } from "@/lib/artist-sets";
import { db } from "@/lib/db";
import { isDrawPending } from "@/lib/daily-draw";
import { getPackState } from "@/lib/packs";
import { getPassState, settlePastSeasons } from "@/lib/pass";
import { PASS_TIERS, XP_PER_TIER } from "@/lib/pass-rules";
import { getQuestStatus } from "@/lib/quests";

// Données de la barre d'infos (haut) et des pastilles de la barre de jeu (bas), pour le joueur connecté
export type HudData = {
  coins: number;
  cards: number;
  stock: number;
  // Stock maximum : 10, ou 15 pour un compte premium
  max: number;
  nextPackAt: string | null;
  // Packs gagnés (classiques, Solo, Épique, Légendaire), en plus du stock qui se recharge
  extraPacks: number;
  drawPending: boolean;
  questsReady: number;
  social: number;
  setsReady: number;
  // Passe de combat : palier atteint, progression vers le suivant (0 à 100), récompenses à réclamer
  passLevel: number;
  passProgress: number;
  passReady: number;
  // Récompenses d'une saison passée versées pendant ce chargement de page (notification)
  seasonRewards: number;
  // Succès débloqués pendant ce chargement de page (notification)
  unlocked: Array<{ key: string; title: string; reward: number }>;
};

export async function getHudData(userId: string): Promise<HudData> {
  // D'abord les succès et la fin de saison du passe : pièces et packs doivent apparaître dans les soldes affichés
  await syncAchievements(userId);
  const seasonRewards = await settlePastSeasons(userId);
  const unlocked = await takeAchievementNotices(userId);
  const [user, pack, quests, social, drawPending, setsReady, pass] = await Promise.all([
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
    isDrawPending(userId),
    countClaimableSets(userId),
    getPassState(userId),
  ]);

  return {
    coins: user.rows[0]?.coins ?? 0,
    cards: user.rows[0]?.cards ?? 0,
    stock: pack.stock,
    max: pack.max,
    nextPackAt: pack.nextPackAt ? pack.nextPackAt.toISOString() : null,
    extraPacks: pack.bonus + pack.solo + pack.epic + pack.legendary,
    drawPending,
    // Pastille Quêtes : récompenses à réclamer, plus la pioche du jour tant qu'elle n'est pas jouée
    questsReady: quests.filter((quest) => !quest.claimed && quest.progress >= quest.target).length + (drawPending ? 1 : 0),
    social: social.rows[0]?.total ?? 0,
    setsReady,
    passLevel: pass.level,
    passProgress: pass.level >= PASS_TIERS ? 100 : Math.floor(((pass.xp % XP_PER_TIER) / XP_PER_TIER) * 100),
    passReady: pass.claimable,
    seasonRewards,
    unlocked: unlocked.map(({ key, title, reward }) => ({ key, title, reward })),
  };
}
