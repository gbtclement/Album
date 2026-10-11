import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { db, withTransaction } from "@/lib/db";
import { CROP_SIZE, DRAW_RATES, DRAW_TIME_ZONE, normalizeTitle, STREAK_BONUS_COINS, STREAK_BONUS_EVERY } from "@/lib/daily-draw-rules";
import { MAX_STOCK } from "@/lib/pack-rules";
import { drawTier } from "@/lib/packs";
import { recordEvent } from "@/lib/quests";
import { RARITY_TIERS, type RarityTier } from "@/lib/rarity";

// Pioche du jour : un album tiré pour chaque joueur et chaque jour, dont on ne montre qu'un morceau de pochette.
// Tant que le joueur n'a pas répondu, rien de ce qui sort d'ici ne doit permettre de deviner l'album
// (ni titre, ni artiste, ni adresse de pochette) : seule l'image découpée par app/pioche/image le montre.

export class DrawError extends Error {}

export type DrawView = {
  date: string;
  tier: RarityTier;
  answered: boolean;
  solved: boolean;
  guessTitle: string | null;
  streak: number;
  // Révélé seulement une fois la réponse donnée
  album: { slug: string; title: string; artist: string; coverUrl: string | null } | null;
};

type DrawRow = {
  draw_date: string;
  album_id: string;
  crop_x: number;
  crop_y: number;
  guess_title: string | null;
  solved: boolean | null;
  streak: number;
  slug: string;
  title: string;
  artist: string;
  cover_url: string | null;
  rarity_tier: RarityTier;
};

const DRAW_COLUMNS = `to_char(d.draw_date, 'YYYY-MM-DD') as draw_date, d.album_id, d.crop_x, d.crop_y, d.guess_title, d.solved, d.streak,
  a.slug, a.title, a.artist, a.cover_url, a.rarity_tier`;

// Date du jour à Paris : la pioche change à minuit, heure française
async function today(client: PoolClient | typeof db): Promise<string> {
  const { rows } = await client.query<{ day: string }>(
    "select to_char((now() at time zone $1)::date, 'YYYY-MM-DD') as day",
    [DRAW_TIME_ZONE],
  );
  return rows[0].day;
}

async function findDraw(client: PoolClient | typeof db, userId: string, day: string, lock = false) {
  const { rows } = await client.query<DrawRow>(
    `select ${DRAW_COLUMNS} from daily_draws d join albums a on a.id = d.album_id
     where d.user_id = $1 and d.draw_date = $2${lock ? " for update of d" : ""}`,
    [userId, day],
  );
  return rows[0] ?? null;
}

// Album du palier tiré, de préférence absent de la collection et jamais pioché ;
// palier vide : on descend puis on monte, comme pour les packs
async function pickDrawAlbum(client: PoolClient, userId: string, tier: RarityTier) {
  const index = RARITY_TIERS.indexOf(tier);
  const order = [...RARITY_TIERS.slice(0, index + 1).reverse(), ...RARITY_TIERS.slice(index + 1)];
  for (const preferNew of [true, false]) {
    for (const candidate of order) {
      const { rows } = await client.query<{ id: string }>(
        `select a.id from albums a
         where a.rarity_tier = $1 and a.cover_url is not null
           and (not $3 or (
             not exists (select 1 from user_albums ua where ua.user_id = $2 and ua.album_id = a.id)
             and not exists (select 1 from daily_draws dd where dd.user_id = $2 and dd.album_id = a.id)))
         order by random() limit 1`,
        [candidate, userId, preferNew],
      );
      if (rows[0]) return rows[0].id;
    }
  }
  throw new DrawError("Le catalogue est vide : aucun album ne peut être pioché.");
}

function toView(row: DrawRow): DrawView {
  const answered = row.solved !== null;
  return {
    date: row.draw_date,
    tier: row.rarity_tier,
    answered,
    solved: row.solved === true,
    guessTitle: row.guess_title,
    streak: row.streak,
    album: answered ? { slug: row.slug, title: row.title, artist: row.artist, coverUrl: row.cover_url } : null,
  };
}

// Pioche du jour du joueur, tirée à sa première visite de la journée
export async function getTodayDraw(userId: string): Promise<DrawView> {
  return withTransaction(async (client) => {
    const day = await today(client);
    const existing = await findDraw(client, userId, day);
    if (existing) return toView(existing);

    const albumId = await pickDrawAlbum(client, userId, drawTier(DRAW_RATES));
    // Coin du morceau montré : on évite les bords, souvent unis ou couverts de texte
    const margin = 0.08;
    const span = 1 - CROP_SIZE - 2 * margin;
    const position = () => margin + (randomInt(1000) / 1000) * span;
    // Deux visites simultanées : la seconde ne crée rien et relit la pioche de la première
    await client.query(
      `insert into daily_draws (user_id, draw_date, album_id, crop_x, crop_y) values ($1, $2, $3, $4, $5)
       on conflict (user_id, draw_date) do nothing`,
      [userId, day, albumId, position(), position()],
    );
    return toView((await findDraw(client, userId, day))!);
  });
}

// Le joueur a-t-il encore sa pioche du jour à jouer ? (sans la tirer : sert aux pastilles et bandeaux)
export async function isDrawPending(userId: string): Promise<boolean> {
  const { rows } = await db.query<{ pending: boolean }>(
    `select not exists (
       select 1 from daily_draws where user_id = $1 and draw_date = (now() at time zone $2)::date and solved is not null
     ) as pending`,
    [userId, DRAW_TIME_ZONE],
  );
  return rows[0].pending;
}

// Pochette et position du morceau à montrer, pour l'image découpée côté serveur
export async function getDrawCrop(userId: string) {
  const draw = await findDraw(db, userId, await today(db));
  return draw ? { coverUrl: draw.cover_url, x: draw.crop_x, y: draw.crop_y, size: CROP_SIZE } : null;
}

export type GuessResult = { solved: boolean; streak: number; bonus: "pack" | "coins" | null; isNew: boolean };

// Une seule réponse par jour : le joueur choisit un album dans les suggestions,
// c'est juste si le titre est le même que celui de l'album pioché (majuscules et accents ignorés)
export async function submitGuess(userId: string, guessedAlbumId: string): Promise<GuessResult> {
  return withTransaction(async (client) => {
    const day = await today(client);
    const draw = await findDraw(client, userId, day, true);
    if (!draw) throw new DrawError("Ouvre d'abord la pioche du jour.");
    if (draw.solved !== null) throw new DrawError("Tu as déjà répondu aujourd'hui. Nouvelle pioche à minuit !");

    const { rows: guessed } = await client.query<{ title: string }>("select title from albums where id = $1", [guessedAlbumId]);
    if (!guessed[0]) throw new DrawError("Choisis un album dans la liste proposée.");
    const solved = normalizeTitle(guessed[0].title) === normalizeTitle(draw.title);

    // Série : la veille réussie la prolonge, sinon elle repart de 1
    const { rows: previous } = await client.query<{ streak: number; solved: boolean | null }>(
      "select streak, solved from daily_draws where user_id = $1 and draw_date = $2::date - 1",
      [userId, day],
    );
    const streak = solved ? (previous[0]?.solved ? previous[0].streak + 1 : 1) : 0;

    await client.query(
      `update daily_draws set guess_title = $3, solved = $4, streak = $5, answered_at = now()
       where user_id = $1 and draw_date = $2`,
      [userId, day, guessed[0].title, solved, streak],
    );

    let isNew = false;
    let bonus: GuessResult["bonus"] = null;
    if (solved) {
      const { rows } = await client.query<{ is_new: boolean }>(
        `insert into user_albums (user_id, album_id, count) values ($1, $2, 1)
         on conflict (user_id, album_id) do update set count = user_albums.count + 1
         returning (xmax = 0) as is_new`,
        [userId, draw.album_id],
      );
      isNew = rows[0].is_new;
      if (isNew) await recordEvent(client, userId, "new_album", 1);

      if (streak % STREAK_BONUS_EVERY === 0) {
        await client.query("insert into pack_stocks (user_id) values ($1) on conflict (user_id) do nothing", [userId]);
        const pack = await client.query("update pack_stocks set stock = stock + 1 where user_id = $1 and stock < $2", [userId, MAX_STOCK]);
        if (pack.rowCount) bonus = "pack";
        else {
          await client.query("update users set coins = coins + $2 where id = $1", [userId, STREAK_BONUS_COINS]);
          bonus = "coins";
        }
      }
    }
    return { solved, streak, bonus, isNew };
  });
}

export type AlbumSuggestion = { id: string; title: string; artist: string };

// Recherche guidée : d'abord les titres qui commencent par le texte tapé, puis ceux qui le contiennent,
// les albums les plus écoutés en premier
export async function searchAlbumTitles(query: string, limit = 8): Promise<AlbumSuggestion[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  const pattern = text.replace(/[\\%_]/g, "\\$&");
  const { rows } = await db.query<AlbumSuggestion>(
    `select id, title, artist from albums
     where title ilike '%' || $1 || '%'
     order by (title ilike $1 || '%') desc, listen_count desc nulls last, title
     limit $2`,
    [pattern, limit],
  );
  return rows;
}
