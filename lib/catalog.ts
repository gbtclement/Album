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
  // Écoutes ListenBrainz (bigint : renvoyé en texte par PostgreSQL)
  listen_count: string | null;
  listener_count: string | null;
  rarity_tier: RarityTier;
  links: AlbumLinks;
};

export type AlbumInput = {
  mbid: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string;
  listens: number | null;
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
       (mbid, slug, title, artist, release_year, cover_url, listen_count, listener_count, links)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (mbid) do update set
       title = excluded.title,
       artist = excluded.artist,
       release_year = coalesce(excluded.release_year, albums.release_year),
       cover_url = excluded.cover_url,
       listen_count = coalesce(excluded.listen_count, albums.listen_count),
       listener_count = coalesce(excluded.listener_count, albums.listener_count),
       links = excluded.links,
       updated_at = now()`,
    [
      input.mbid,
      slugFor(input.artist, input.title, input.mbid),
      input.title,
      input.artist,
      input.releaseYear,
      input.coverUrl,
      input.listens,
      input.listeners,
      JSON.stringify(input.links),
    ],
  );
}

// Identifiants MusicBrainz déjà présents : l'import ne refait pas le travail pour eux
export async function existingMbids() {
  const { rows } = await db.query<{ mbid: string }>("select mbid from albums");
  return new Set(rows.map((row) => row.mbid));
}

// Met à jour les écoutes de tout le catalogue d'un coup
export async function saveListens(listens: Map<string, { listens: number; listeners: number }>) {
  const mbids = [...listens.keys()];
  if (mbids.length === 0) return 0;
  const result = await db.query(
    `update albums set listen_count = data.listens, listener_count = data.listeners, updated_at = now()
     from (select unnest($1::uuid[]) as mbid, unnest($2::bigint[]) as listens, unnest($3::bigint[]) as listeners) as data
     where albums.mbid = data.mbid`,
    [mbids, mbids.map((mbid) => listens.get(mbid)!.listens), mbids.map((mbid) => listens.get(mbid)!.listeners)],
  );
  return result.rowCount ?? 0;
}

// Écoutes comptées au plus par auditeur : un auditeur écoute un album environ 23 fois (médiane),
// 99 % des albums restent sous 100. Au-delà, ce sont quelques fans qui le font tourner en boucle
// (un album à 48 millions d'écoutes pour moins de 5 000 auditeurs, soit 10 000 écoutes chacun).
export const MAX_LISTENS_PER_LISTENER = 100;

// Recalcule les paliers de rareté de tout le catalogue, à partir des écoutes ListenBrainz plafonnées
// (voir MAX_LISTENS_PER_LISTENER) : les albums les plus écoutés sont les plus rares. Sans statistique : "commun".
export async function recomputeRarity() {
  const ranked = await db.query<{ id: string }>(
    `select id from albums where listener_count is not null
     order by least(listen_count, listener_count * $1) desc nulls last, listener_count desc, id`,
    [MAX_LISTENS_PER_LISTENER],
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
  await db.query("update albums set rarity_tier = 'commun' where listener_count is null");
  return total;
}

export async function findAlbumBySlug(slug: string) {
  const result = await db.query<AlbumRow>("select * from albums where slug = $1", [slug]);
  return result.rows[0] ?? null;
}
