-- Packs, collection et pièces (lot 3)

-- Pièces : monnaie virtuelle, sans valeur réelle
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 1000 CHECK (coins >= 0);

-- Stock de packs : un pack se recharge toutes les 5 minutes, 10 maximum
CREATE TABLE IF NOT EXISTS pack_stocks (
  user_id           uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  stock             integer NOT NULL DEFAULT 3 CHECK (stock BETWEEN 0 AND 10),
  last_recharged_at timestamptz NOT NULL DEFAULT now()
);

-- Collection : une ligne par album possédé, count = nombre d'exemplaires (doublons conservés)
CREATE TABLE IF NOT EXISTS user_albums (
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  album_id          uuid NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  count             integer NOT NULL DEFAULT 1 CHECK (count >= 1),
  first_obtained_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, album_id)
);

CREATE INDEX IF NOT EXISTS user_albums_album_idx ON user_albums (album_id);

-- Historique des ouvertures de packs
CREATE TABLE IF NOT EXISTS pack_openings (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  album_ids  uuid[] NOT NULL,
  opened_at  timestamptz NOT NULL DEFAULT now()
);
