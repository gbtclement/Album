-- Doublons pressés en poussière de vinyle, poussière qui sert à fabriquer un album précis (lot DUP1)

ALTER TABLE users ADD COLUMN IF NOT EXISTS dust integer NOT NULL DEFAULT 0 CHECK (dust >= 0);

-- Historique des albums fabriqués (export des données, contrôle de triche)
CREATE TABLE IF NOT EXISTS crafts (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  album_id   uuid REFERENCES albums (id) ON DELETE SET NULL,
  cost       integer NOT NULL CHECK (cost > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crafts_user_idx ON crafts (user_id, created_at);
