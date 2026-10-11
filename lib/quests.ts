import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import type { Reward } from "@/lib/pack-rules";
import { grantPacks } from "@/lib/packs";

// Quêtes : chaque événement du jeu fait avancer les quêtes qui l'écoutent.
// Les périodes sont en UTC : journalière (jour), hebdomadaire (lundi), mensuelle (1er du mois).
// Les quêtes rapportent surtout des packs : les pièces viennent des succès et des collections d'artiste.

export type QuestEvent = "pack_opened" | "rare_card" | "legendary_card" | "new_album" | "trade";
export type Period = "daily" | "weekly" | "monthly";

export type QuestDef = {
  key: string;
  period: Period;
  event: QuestEvent;
  title: string;
  target: number;
  reward: Reward;
};

// Journalière : 1 pack Solo · hebdomadaire : 1 pack Solo + 100 pièces · mensuelle : 1 pack + 500 pièces
const DAILY: Reward = { coins: 0, packs: 0, solo: 1 };
const WEEKLY: Reward = { coins: 100, packs: 0, solo: 1 };
const MONTHLY: Reward = { coins: 500, packs: 1, solo: 0 };

export const PERIOD_LABELS: Record<Period, string> = {
  daily: "Journalières",
  weekly: "Hebdomadaires",
  monthly: "Mensuelles",
};

export const QUESTS: QuestDef[] = [
  { key: "daily_packs", period: "daily", event: "pack_opened", title: "Ouvre 3 packs", target: 3, reward: DAILY },
  { key: "daily_new", period: "daily", event: "new_album", title: "Obtiens 2 albums nouveaux", target: 2, reward: DAILY },
  { key: "daily_trade", period: "daily", event: "trade", title: "Réalise un échange d'album ou un achat", target: 1, reward: DAILY },
  { key: "weekly_packs", period: "weekly", event: "pack_opened", title: "Ouvre 20 packs", target: 20, reward: WEEKLY },
  { key: "weekly_rare", period: "weekly", event: "rare_card", title: "Obtiens 3 cartes rares ou plus", target: 3, reward: WEEKLY },
  { key: "weekly_trade", period: "weekly", event: "trade", title: "Réalise 3 échanges d'albums ou achats", target: 3, reward: WEEKLY },
  { key: "monthly_packs", period: "monthly", event: "pack_opened", title: "Ouvre 100 packs", target: 100, reward: MONTHLY },
  { key: "monthly_new", period: "monthly", event: "new_album", title: "Obtiens 30 albums nouveaux", target: 30, reward: MONTHLY },
  { key: "monthly_legendary", period: "monthly", event: "legendary_card", title: "Obtiens 1 carte légendaire", target: 1, reward: MONTHLY },
];

export class QuestError extends Error {}

function formatDate(time: number) {
  return new Date(time).toISOString().slice(0, 10);
}

// Premier jour (YYYY-MM-DD, UTC) de la période en cours
export function periodStart(period: Period, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (period === "daily") return formatDate(Date.UTC(year, month, day));
  if (period === "monthly") return formatDate(Date.UTC(year, month, 1));
  // Semaine ISO : le lundi est le premier jour (dimanche = 7)
  const isoWeekday = now.getUTCDay() || 7;
  return formatDate(Date.UTC(year, month, day - isoWeekday + 1));
}

// Ajoute `amount` à la progression de toutes les quêtes écoutant cet événement.
// Doit être appelée dans la transaction de l'action qui déclenche l'événement.
export async function recordEvent(client: PoolClient, userId: string, event: QuestEvent, amount: number) {
  if (amount <= 0) return;
  for (const quest of QUESTS.filter((item) => item.event === event)) {
    await client.query(
      `insert into user_quests (user_id, quest_key, period_start, progress)
       values ($1, $2, $3, $4)
       on conflict (user_id, quest_key, period_start)
       do update set progress = least(user_quests.progress + excluded.progress, $5)`,
      [userId, quest.key, periodStart(quest.period), Math.min(amount, quest.target), quest.target],
    );
  }
}

export type QuestStatus = QuestDef & {
  periodStart: string;
  progress: number;
  claimed: boolean;
};

// État des quêtes pour la période en cours
export async function getQuestStatus(userId: string): Promise<QuestStatus[]> {
  const starts = [...new Set(QUESTS.map((quest) => periodStart(quest.period)))];
  const result = await db.query<{ quest_key: string; period_start: string; progress: number; claimed: boolean }>(
    `select quest_key, to_char(period_start, 'YYYY-MM-DD') as period_start, progress, claimed
     from user_quests where user_id = $1 and period_start = any($2::date[])`,
    [userId, starts],
  );

  return QUESTS.map((quest) => {
    const start = periodStart(quest.period);
    const row = result.rows.find((item) => item.quest_key === quest.key && item.period_start === start);
    return {
      ...quest,
      periodStart: start,
      progress: row?.progress ?? 0,
      claimed: row?.claimed ?? false,
    };
  });
}

// Récupère la récompense d'une quête terminée, une seule fois par période
export async function claimQuest(userId: string, questKey: string) {
  const quest = QUESTS.find((item) => item.key === questKey);
  if (!quest) throw new QuestError("Quête inconnue.");
  const start = periodStart(quest.period);

  return withTransaction(async (client) => {
    const { rows } = await client.query<{ progress: number; claimed: boolean }>(
      `select progress, claimed from user_quests
       where user_id = $1 and quest_key = $2 and period_start = $3 for update`,
      [userId, quest.key, start],
    );
    const row = rows[0];
    if (!row || row.progress < quest.target) throw new QuestError("Cette quête n'est pas encore terminée.");
    if (row.claimed) throw new QuestError("Tu as déjà récupéré cette récompense.");

    await client.query(
      "update user_quests set claimed = true where user_id = $1 and quest_key = $2 and period_start = $3",
      [userId, quest.key, start],
    );
    if (quest.reward.coins > 0) {
      await client.query("update users set coins = coins + $2 where id = $1", [userId, quest.reward.coins]);
    }
    await grantPacks(client, userId, { classic: quest.reward.packs, solo: quest.reward.solo });
    return quest.reward;
  });
}
