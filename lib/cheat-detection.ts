import { analyzeOpenings, type DrawSignals, type Reason, scoreSuspect, SUSPECT_MIN_SCORE } from "@/lib/cheat-rules";
import { db } from "@/lib/db";

// Détection de triche (espace admin) : lit l'activité récente et classe les comptes suspects (règles : lib/cheat-rules.ts).
// Périodes : packs sur 7 jours, pioche sur 14 jours, comptes « mules » sur 30 jours.

// En dessous, pas assez d'ouvertures pour juger un rythme
const MIN_OPENINGS = 20;
// Un « compte récent » : créé il y a moins de 30 jours
const YOUNG_ACCOUNT_DAYS = 30;
// Part des échanges et achats d'un compte récent faits avec le même joueur pour le considérer comme sa « mule »
const MULE_LOYALTY = 0.8;

export type Suspect = {
  id: string;
  pseudo: string;
  email: string;
  created_at: Date;
  score: number;
  reasons: Reason[];
  openings7d: number;
};

async function openingsByUser() {
  const { rows } = await db.query<{ user_id: string; times: Date[] }>(
    `select user_id, array_agg(opened_at order by opened_at) as times
     from pack_openings where opened_at > now() - interval '7 days'
     group by user_id having count(*) >= $1`,
    [MIN_OPENINGS],
  );
  return new Map(rows.map((row) => [row.user_id, row.times]));
}

// Pioche : réponses des 14 derniers jours et temps de réponse médian (de l'ouverture de la pioche à la réponse)
async function drawsByUser() {
  const { rows } = await db.query<{ user_id: string; played: number; solved: number; median: number | null }>(
    `select user_id, count(*)::int as played, count(*) filter (where solved)::int as solved,
            percentile_cont(0.5) within group (order by extract(epoch from answered_at - created_at))::float as median
     from daily_draws
     where draw_date > current_date - 14 and answered_at is not null
     group by user_id`,
  );
  return new Map<string, DrawSignals>(rows.map((row) => [row.user_id, { played: row.played, solved: row.solved, medianAnswerSeconds: row.median }]));
}

// Mules : comptes récents qui donnent sans contrepartie (échange à sens unique, ou achat au marché à plus de
// 3 fois la cote de l'album) presque uniquement au même joueur. Résultat : nombre de mules par joueur servi.
async function mulesByUser() {
  const { rows } = await db.query<{ receiver_id: string; mules: number }>(
    `with gifts as (
       -- Échanges acceptés : la mule donne quelque chose et ne reçoit presque rien (1 pièce au plus)
       select t.proposer_id as giver, t.receiver_id as receiver from trades t
       where t.status = 'accepted' and t.resolved_at > now() - make_interval(days => $1)
         and t.request_album_id is null and t.request_coins <= 1
       union all
       select t.receiver_id, t.proposer_id from trades t
       where t.status = 'accepted' and t.resolved_at > now() - make_interval(days => $1)
         and t.offer_album_id is null and t.offer_coins <= 1
       union all
       -- Marché : la mule achète une carte du joueur à plus de 3 fois sa cote (pièces transférées)
       select l.buyer_id, l.seller_id from listings l
       where l.status = 'sold' and l.buyer_id is not null and l.closed_at > now() - make_interval(days => $1)
         and l.price_coins >= 200
         and l.price_coins > 3 * coalesce((select avg(s.price_coins) from market_sales s
                                           where s.album_id = l.album_id and s.created_at > now() - interval '30 days'), 0)
     ),
     exchanges as (
       -- Tous les échanges acceptés et achats d'un compte, pour mesurer sa « fidélité » à un joueur
       select proposer_id as who, receiver_id as other from trades where status = 'accepted' and resolved_at > now() - make_interval(days => $1)
       union all select receiver_id, proposer_id from trades where status = 'accepted' and resolved_at > now() - make_interval(days => $1)
       union all select buyer_id, seller_id from listings where status = 'sold' and buyer_id is not null and closed_at > now() - make_interval(days => $1)
     ),
     loyalty as (
       select who, other, count(*)::float / sum(count(*)) over (partition by who) as share from exchanges group by who, other
     )
     select g.receiver as receiver_id, count(distinct g.giver)::int as mules
     from gifts g
     join users giver on giver.id = g.giver and giver.created_at > now() - make_interval(days => $1)
     join loyalty l on l.who = g.giver and l.other = g.receiver and l.share >= $2
     group by g.receiver`,
    [YOUNG_ACCOUNT_DAYS, MULE_LOYALTY],
  );
  return new Map(rows.map((row) => [row.receiver_id, row.mules]));
}

export async function findSuspects(): Promise<Suspect[]> {
  const [openings, draws, mules] = await Promise.all([openingsByUser(), drawsByUser(), mulesByUser()]);
  const candidates = new Set([...openings.keys(), ...draws.keys(), ...mules.keys()]);

  const scored = [...candidates].flatMap((id) => {
    const signals = analyzeOpenings(openings.get(id) ?? []);
    const { score, reasons } = scoreSuspect({ openings: signals, draws: draws.get(id) ?? null, muleAccounts: mules.get(id) ?? 0 });
    return score >= SUSPECT_MIN_SCORE ? [{ id, score, reasons, openings7d: signals.openings }] : [];
  });
  if (scored.length === 0) return [];

  const { rows } = await db.query<{ id: string; pseudo: string; email: string; created_at: Date }>(
    "select id, pseudo, email, created_at from users where id = any($1)",
    [scored.map((item) => item.id)],
  );
  const users = new Map(rows.map((row) => [row.id, row]));
  return scored
    .filter((item) => users.has(item.id))
    .map((item) => ({ ...users.get(item.id)!, ...item }))
    .sort((a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo, "fr"));
}
