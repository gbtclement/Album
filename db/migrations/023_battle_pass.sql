-- Lot P2 : passe de combat. Une ligne d'XP par joueur et par saison (mois), une ligne par palier réclamé.
CREATE TABLE IF NOT EXISTS pass_progress (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season   date NOT NULL,
  xp       integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  -- Saison passée dont les paliers non réclamés ont été versés automatiquement
  settled  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, season)
);

CREATE TABLE IF NOT EXISTS pass_claims (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season     date NOT NULL,
  tier       smallint NOT NULL CHECK (tier BETWEEN 1 AND 30),
  track      text NOT NULL CHECK (track IN ('free', 'premium')),
  -- Versé automatiquement en fin de saison (pas réclamé par le joueur)
  auto       boolean NOT NULL DEFAULT false,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season, tier, track)
);
