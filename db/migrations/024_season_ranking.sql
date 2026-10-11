-- Lot S1 : classement saisonnier. Les points du mois sont gardés avec l'XP du passe (même joueur, même saison).
-- points_at : moment du dernier point gagné (départage les égalités : le premier arrivé passe devant).
-- ranked : saison passée dont la place a déjà été examinée pour les récompenses.
ALTER TABLE pass_progress ADD COLUMN IF NOT EXISTS season_points integer NOT NULL DEFAULT 0 CHECK (season_points >= 0);
ALTER TABLE pass_progress ADD COLUMN IF NOT EXISTS points_at timestamptz;
ALTER TABLE pass_progress ADD COLUMN IF NOT EXISTS ranked boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS pass_progress_season_points_idx ON pass_progress (season, season_points DESC, points_at);

-- Récompenses de fin de saison versées (top 20), une par joueur et par saison
CREATE TABLE IF NOT EXISTS season_awards (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season     date NOT NULL,
  rank       smallint NOT NULL CHECK (rank BETWEEN 1 AND 20),
  points     integer NOT NULL,
  coins      integer NOT NULL DEFAULT 0,
  classic    integer NOT NULL DEFAULT 0,
  epic       integer NOT NULL DEFAULT 0,
  legendary  integer NOT NULL DEFAULT 0,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season)
);
