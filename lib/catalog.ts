import { db } from "@/lib/db";
import { type RarityTier, rarityScore, tierForPlays } from "@/lib/rarity";

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
  // Écoutes Last.fm, affichées en priorité sur la fiche (null si pas encore récupérées ou album inconnu)
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
      // Toujours en https (Cover Art Archive renvoie parfois du http://)
      input.coverUrl.replace(/^http:\/\//, "https://"),
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

// Recalcule la rareté de tout le catalogue à partir des écoutes Last.fm (seuils fixes, voir lib/rarity.ts) :
// un album garde sa rareté quand d'autres arrivent. Sans aucune statistique : "commun".
// Renvoie le nombre d'albums dont au moins une statistique est connue.
export async function recomputeRarity() {
  const { rows } = await db.query<{
    id: string;
    lastfm_playcount: string | null;
    lastfm_listeners: string | null;
    listen_count: string | null;
    listener_count: string | null;
  }>("select id, lastfm_playcount, lastfm_listeners, listen_count, listener_count from albums");
  const number = (value: string | null) => (value === null ? null : Number(value));
  const ids = rows.map((row) => row.id);
  const tiers = rows.map((row) =>
    tierForPlays(
      rarityScore({
        lastfmPlaycount: number(row.lastfm_playcount),
        lastfmListeners: number(row.lastfm_listeners),
        listens: number(row.listen_count),
        listeners: number(row.listener_count),
      }),
    ),
  );

  if (ids.length > 0) {
    await db.query(
      `update albums set rarity_tier = data.tier, updated_at = now()
       from (select unnest($1::uuid[]) as id, unnest($2::text[]) as tier) as data
       where albums.id = data.id and albums.rarity_tier <> data.tier`,
      [ids, tiers],
    );
  }
  return rows.filter((row) => row.lastfm_playcount !== null || row.listen_count !== null).length;
}

export async function findAlbumBySlug(slug: string) {
  const result = await db.query<AlbumRow>("select * from albums where slug = $1", [slug]);
  return result.rows[0] ?? null;
}

// Autres albums du même artiste (fiche album), les plus écoutés d'abord
export async function findAlbumsByArtist(artist: string, excludeId: string, limit = 6) {
  const result = await db.query<Pick<AlbumRow, "slug" | "title" | "release_year" | "cover_url" | "rarity_tier">>(
    `select slug, title, release_year, cover_url, rarity_tier from albums
     where artist = $1 and id <> $2
     order by listen_count desc nulls last, release_year
     limit $3`,
    [artist, excludeId, limit],
  );
  return result.rows;
}
