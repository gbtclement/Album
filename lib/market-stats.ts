import { db } from "@/lib/db";

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

export type Mover = {
  slug: string;
  title: string;
  artist: string;
  firstPrice: number;
  lastPrice: number;
  change: number;
  sales: number;
};

// Albums avec au moins deux ventes sur la période, classés par variation
export async function getMovers(days: number, limit: number) {
  const result = await db.query<{
    slug: string;
    title: string;
    artist: string;
    sales: number;
    first_price: number;
    last_price: number;
  }>(
    `with recent as (
       select album_id, price_coins, created_at, id,
              row_number() over (partition by album_id order by created_at asc, id asc) as first_rank,
              row_number() over (partition by album_id order by created_at desc, id desc) as last_rank,
              count(*) over (partition by album_id) as sales
       from market_sales
       where created_at > now() - make_interval(days => $1)
     )
     select a.slug, a.title, a.artist, f.sales,
            f.price_coins as first_price, l.price_coins as last_price
     from recent f
     join recent l on l.album_id = f.album_id and l.last_rank = 1
     join albums a on a.id = f.album_id
     where f.first_rank = 1 and f.sales >= 2`,
    [days],
  );

  const movers: Mover[] = result.rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    artist: row.artist,
    firstPrice: row.first_price,
    lastPrice: row.last_price,
    change: Math.round(((row.last_price - row.first_price) / row.first_price) * 1000) / 10,
    sales: row.sales,
  }));

  movers.sort((a, b) => b.change - a.change);
  return {
    rises: movers.filter((mover) => mover.change > 0).slice(0, limit),
    falls: movers.filter((mover) => mover.change < 0).reverse().slice(0, limit),
  };
}
