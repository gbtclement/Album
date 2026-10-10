import { db } from "@/lib/db";
import type { RarityTier } from "@/lib/rarity";

// Statistiques de la bourse : prix moyens quotidiens des ventes en pièces.

export const MAX_DAYS = 365;
export const DEFAULT_DAYS = 30;

export type SeriesPoint = { time: string; value: number; volume: number };

export function clampDays(raw: string | null | undefined) {
  const parsed = Number(raw ?? DEFAULT_DAYS);
  if (!Number.isFinite(parsed)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(1, Math.floor(parsed)));
}

// Série quotidienne du marché entier (ou d'un seul album si albumId est donné)
export async function getSeries(days: number, albumId: string | null): Promise<SeriesPoint[]> {
  const result = await db.query<{ day: string; value: number; volume: number }>(
    `select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
            round(avg(price_coins))::int as value,
            count(*)::int as volume
     from market_sales
     where created_at > now() - make_interval(days => $1)
       and ($2::uuid is null or album_id = $2)
     group by 1
     order by 1`,
    [days, albumId],
  );
  return result.rows.map((row) => ({ time: row.day, value: row.value, volume: row.volume }));
}

// Variation en pourcentage entre le premier et le dernier point de la période
export function variationPercent(points: SeriesPoint[]): number | null {
  if (points.length < 2 || points[0].value === 0) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export type StockLine = {
  slug: string;
  title: string;
  artist: string;
  cover: string | null;
  tier: RarityTier;
  // Prix moyen de chaque jour avec au moins une vente, du plus ancien au plus récent
  points: number[];
  last: number;
  // Variation entre le premier et le dernier jour de vente de la période (null avec un seul jour)
  change: number | null;
};

// Cotes de la bourse : albums vendus sur la période, les plus échangés d'abord
export async function getStockList(days: number, limit: number): Promise<StockLine[]> {
  const result = await db.query<{ slug: string; title: string; artist: string; cover_url: string | null; rarity_tier: RarityTier; points: number[] }>(
    `with daily as (
       select album_id, date_trunc('day', created_at) as day, round(avg(price_coins))::int as value, count(*) as sales
       from market_sales
       where created_at > now() - make_interval(days => $1)
       group by 1, 2
     )
     select a.slug, a.title, a.artist, a.cover_url, a.rarity_tier, array_agg(d.value order by d.day) as points
     from daily d
     join albums a on a.id = d.album_id
     group by a.id
     order by sum(d.sales) desc, max(d.day) desc
     limit $2`,
    [days, limit],
  );
  return result.rows.map((row) => {
    const first = row.points[0];
    const last = row.points[row.points.length - 1];
    return {
      slug: row.slug,
      title: row.title,
      artist: row.artist,
      cover: row.cover_url,
      tier: row.rarity_tier,
      points: row.points,
      last,
      change: row.points.length > 1 && first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : null,
    };
  });
}
