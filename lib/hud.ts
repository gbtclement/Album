import { syncAchievements, takeAchievementNotices } from "@/lib/achievements";
import { countClaimableSets } from "@/lib/artist-sets";
import { db } from "@/lib/db";
import { isDrawPending } from "@/lib/daily-draw";
import { getPackState } from "@/lib/packs";
import { getPassState, settlePastSeasons } from "@/lib/pass";
import { PASS_TIERS, XP_PER_TIER } from "@/lib/pass-rules";
import { settleSeasonRanking, type SeasonAward } from "@/lib/season";
import { getQuestStatus, isClaimable } from "@/lib/quests";
import { countWishesOnSale } from "@/lib/wishlist";

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
  // Albums souhaités mis en vente par d'autres joueurs (pastille du Marché)
  wishesOnSale: number;
  // Passe de combat : palier atteint, progression vers le suivant (0 à 100), récompenses à réclamer
  passLevel: number;
  passProgress: number;
  // XP gagnée dans le palier en cours (sur XP_PER_TIER), pour la barre de la version ordinateur
  passTierXp: number;
  passReady: number;
  // Récompenses d'une saison passée versées pendant ce chargement de page (notification)
  seasonRewards: number;
  // Récompense du classement saisonnier versée pendant ce chargement de page (notification)
  seasonAward: SeasonAward | null;
  // Succès débloqués pendant ce chargement de page (notification)
  unlocked: Array<{ key: string; title: string; reward: number }>;
};

export async function getHudData(userId: string): Promise<HudData> {
  // D'abord les succès et la fin de saison du passe : pièces et packs doivent apparaître dans les soldes affichés.
  // Les succès et la fin de saison sont indépendants : vérifiés en même temps. Les deux versements de fin de saison
  // restent l'un après l'autre (ils verrouillent les mêmes lignes de pass_progress, sans attendre l'autre).
  const [, [seasonRewards, seasonAward]] = await Promise.all([
    syncAchievements(userId),
    (async () => [await settlePastSeasons(userId), await settleSeasonRanking(userId)] as const)(),
  ]);
  const unlocked = await takeAchievementNotices(userId);
  const [user, pack, quests, social, drawPending, setsReady, pass, wishesOnSale] = await Promise.all([
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
    countWishesOnSale(userId),
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
    questsReady: quests.filter((quest) => isClaimable(quest, pass.premium)).length + (drawPending ? 1 : 0),
    social: social.rows[0]?.total ?? 0,
    setsReady,
    wishesOnSale,
    passLevel: pass.level,
    passProgress: pass.level >= PASS_TIERS ? 100 : Math.floor(((pass.xp % XP_PER_TIER) / XP_PER_TIER) * 100),
    passTierXp: pass.level >= PASS_TIERS ? XP_PER_TIER : pass.xp % XP_PER_TIER,
    passReady: pass.claimable,
    seasonRewards,
    seasonAward,
    unlocked: unlocked.map(({ key, title, reward }) => ({ key, title, reward })),
  };
}
