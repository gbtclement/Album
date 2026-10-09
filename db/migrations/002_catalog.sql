-- Catalogue d'albums (lot 2)
-- Rempli par scripts/import-catalog.ts, lu par les packs et les pages album.

CREATE TABLE IF NOT EXISTS albums (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identifiant MusicBrainz du "release group" : clé de correspondance entre les sources
  mbid            uuid NOT NULL UNIQUE,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  artist          text NOT NULL,
  release_year    integer,
  cover_url       text,
  -- Statistiques Last.fm (NULL tant qu'on n'a pas la donnée)
  lastfm_playcount bigint,
  lastfm_listeners bigint,
  rarity_tier     text NOT NULL DEFAULT 'commun'
    CHECK (rarity_tier IN ('commun', 'peu_commun', 'rare', 'epique', 'legendaire')),
  -- Liens d'écoute : { "spotify": { "url": "...", "exact": true }, ... }
  links           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS albums_rarity_tier_idx ON albums (rarity_tier);
