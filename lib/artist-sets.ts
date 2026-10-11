import { db, withTransaction } from "@/lib/db";
import { MAX_STOCK } from "@/lib/pack-rules";
import { PACK_FALLBACK_COINS, SET_MIN_ALBUMS, setReward, type SetReward } from "@/lib/artist-set-rules";
import type { RarityTier } from "@/lib/rarity";

// Collections d'artiste : un set par artiste d'au moins 3 albums. On n'affiche que les sets commencés
// (au moins un album possédé) ou déjà récompensés.

export class ArtistSetError extends Error {}

export type SetAlbum = { slug: string; title: string; coverUrl: string | null; tier: RarityTier; owned: boolean };

export type ArtistSet = {
  artist: string;
  albums: SetAlbum[];
  owned: number;
  total: number;
  reward: SetReward;
  claimed: boolean;
};

const STARTED_ARTISTS = `
  select a.artist from user_albums ua join albums a on a.id = ua.album_id where ua.user_id = $1 and ua.count > 0
  union
  select artist from artist_set_rewards where user_id = $1`;

export async function getArtistSets(userId: string): Promise<ArtistSet[]> {
  const [albums, rewards] = await Promise.all([
    db.query<{ artist: string; slug: string; title: string; cover_url: string | null; rarity_tier: RarityTier; owned: boolean }>(
      `with sized as (
         select artist from albums where artist in (${STARTED_ARTISTS}) group by artist having count(*) >= $2
       )
       select a.artist, a.slug, a.title, a.cover_url, a.rarity_tier, (ua.album_id is not null) as owned
       from albums a
       join sized using (artist)
       left join user_albums ua on ua.album_id = a.id and ua.user_id = $1 and ua.count > 0
       order by a.artist, a.release_year nulls last, a.title`,
      [userId, SET_MIN_ALBUMS],
    ),
    db.query<{ artist: string }>("select artist from artist_set_rewards where user_id = $1", [userId]),
  ]);
  const claimed = new Set(rewards.rows.map((row) => row.artist));

  const byArtist = new Map<string, SetAlbum[]>();
  for (const row of albums.rows) {
    const list = byArtist.get(row.artist) ?? [];
    list.push({ slug: row.slug, title: row.title, coverUrl: row.cover_url, tier: row.rarity_tier, owned: row.owned });
    byArtist.set(row.artist, list);
  }

  const sets = [...byArtist].map(([artist, list]): ArtistSet => ({
    artist,
    albums: list,
    owned: list.filter((album) => album.owned).length,
    total: list.length,
    reward: setReward(list.map((album) => album.tier)),
    claimed: claimed.has(artist),
  }));

  // D'abord les récompenses à récupérer, puis les sets les plus avancés, les sets récompensés à la fin
  const rank = (set: ArtistSet) => (set.claimed ? 2 : set.owned === set.total ? 0 : 1);
  return sets.sort(
    (a, b) => rank(a) - rank(b) || b.owned / b.total - a.owned / a.total || b.owned - a.owned || a.artist.localeCompare(b.artist, "fr"),
  );
}

// Nombre de sets terminés dont la récompense attend (pastille de la barre de jeu)
export async function countClaimableSets(userId: string): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    `select count(*)::int as total from (
       select a.artist
       from albums a
       left join user_albums ua on ua.album_id = a.id and ua.user_id = $1 and ua.count > 0
       where a.artist in (select a2.artist from user_albums u2 join albums a2 on a2.id = u2.album_id where u2.user_id = $1 and u2.count > 0)
       group by a.artist
       having count(*) >= $2 and count(ua.album_id) = count(*)
     ) done
     where not exists (select 1 from artist_set_rewards r where r.user_id = $1 and r.artist = done.artist)`,
    [userId, SET_MIN_ALBUMS],
  );
  return rows[0].total;
}

export type ClaimResult = SetReward & { packGiven: boolean };

// Récupère la récompense d'un set complet, une seule fois par artiste
export async function claimArtistSet(userId: string, artist: string): Promise<ClaimResult> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ rarity_tier: RarityTier; owned: boolean }>(
      `select a.rarity_tier, exists (select 1 from user_albums ua where ua.user_id = $1 and ua.album_id = a.id and ua.count > 0) as owned
       from albums a where a.artist = $2`,
      [userId, artist],
    );
    if (rows.length < SET_MIN_ALBUMS) throw new ArtistSetError("Cet artiste n'a pas de collection à compléter.");
    if (rows.some((row) => !row.owned)) throw new ArtistSetError("Il te manque encore des albums de cet artiste.");

    const reward = setReward(rows.map((row) => row.rarity_tier));
    // La clé primaire (joueur, artiste) empêche de récupérer deux fois, même avec deux clics simultanés
    const inserted = await client.query(
      `insert into artist_set_rewards (user_id, artist, set_size, coins, pack) values ($1, $2, $3, $4, $5)
       on conflict (user_id, artist) do nothing`,
      [userId, artist, rows.length, reward.coins, reward.pack],
    );
    if (!inserted.rowCount) throw new ArtistSetError("Tu as déjà récupéré la récompense de cet artiste.");

    let coins = reward.coins;
    let packGiven = false;
    if (reward.pack) {
      await client.query("insert into pack_stocks (user_id) values ($1) on conflict (user_id) do nothing", [userId]);
      const pack = await client.query("update pack_stocks set stock = stock + 1 where user_id = $1 and stock < $2", [userId, MAX_STOCK]);
      packGiven = Boolean(pack.rowCount);
      if (!packGiven) coins += PACK_FALLBACK_COINS;
    }
    await client.query("update users set coins = coins + $2 where id = $1", [userId, coins]);
    return { coins, pack: reward.pack, packGiven };
  });
}
