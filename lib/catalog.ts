import { db } from "@/lib/db";
import { tierForRank, type RarityTier } from "@/lib/rarity";

export type AlbumLink = { url: string; exact: boolean };
export type AlbumLinks = Partial<Record<"spotify" | "deezer" | "youtube", AlbumLink>>;

export type AlbumRow = {
  id: string;
  mbid: string;
  slug: string;
  title: string;
  artist: string;
  release_year: number | null;
  cover_url: string | null;
  lastfm_playcount: string | null;
  lastfm_listeners: string | null;
  rarity_tier: RarityTier;
  links: AlbumLinks;
};

export type AlbumInput = {
  mbid: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string;
  playcount: number | null;
  listeners: number | null;
  links: AlbumLinks;
};

// "Michael Jackson" + "Thriller" -> "michael-jackson-thriller"
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function slugFor(artist: string, title: string, mbid: string) {
  // Le début du MBID évite les collisions entre deux albums au même nom
  return `${slugify(`${artist} ${title}`)}-${mbid.slice(0, 8)}`;
}

export async function upsertAlbum(input: AlbumInput) {
  await db.query(
    `insert into albums
       (mbid, slug, title, artist, release_year, cover_url, lastfm_playcount, lastfm_listeners, links)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (mbid) do update set
       title = excluded.title,
       artist = excluded.artist,
       release_year = excluded.release_year,
       cover_url = excluded.cover_url,
       lastfm_playcount = coalesce(excluded.lastfm_playcount, albums.lastfm_playcount),
       lastfm_listeners = coalesce(excluded.lastfm_listeners, albums.lastfm_listeners),
       links = excluded.links,
       updated_at = now()`,
    [
      input.mbid,
      slugFor(input.artist, input.title, input.mbid),
      input.title,
      input.artist,
      input.releaseYear,
      input.coverUrl,
      input.playcount,
      input.listeners,
      JSON.stringify(input.links),
    ],
  );
}

// Recalcule les paliers de rareté de tout le catalogue, à partir des écoutes Last.fm.
// Les albums sans statistique restent "commun".
export async function recomputeRarity() {
  const ranked = await db.query<{ id: string }>(
    "select id from albums where lastfm_playcount is not null order by lastfm_playcount desc, id",
  );
  const total = ranked.rows.length;
  const ids = ranked.rows.map((row) => row.id);
  const tiers = ids.map((_, rank) => tierForRank(rank, total));

  if (total > 0) {
    await db.query(
      `update albums set rarity_tier = data.tier, updated_at = now()
       from (select unnest($1::uuid[]) as id, unnest($2::text[]) as tier) as data
       where albums.id = data.id`,
      [ids, tiers],
    );
  }
  await db.query("update albums set rarity_tier = 'commun' where lastfm_playcount is null");
  return total;
}

export async function findAlbumBySlug(slug: string) {
  const result = await db.query<AlbumRow>("select * from albums where slug = $1", [slug]);
  return result.rows[0] ?? null;
}
