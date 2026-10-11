-- Pioche du jour (lot G1) : chaque joueur tire un album par jour (minuit, heure de Paris),
-- n'en voit qu'un morceau de pochette et a une seule chance pour trouver son nom

CREATE TABLE IF NOT EXISTS daily_draws (
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  draw_date    date NOT NULL,
  album_id     uuid NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  -- Coin haut gauche du morceau de pochette montré, en fraction de la largeur et de la hauteur
  crop_x       real NOT NULL,
  crop_y       real NOT NULL,
  -- Réponse du joueur : null tant qu'il n'a pas répondu
  guess_title  text,
  solved       boolean,
  -- Bonnes réponses d'affilée, jour après jour, en comptant celle-ci
  streak       integer NOT NULL DEFAULT 0,
  answered_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, draw_date)
);

CREATE INDEX IF NOT EXISTS daily_draws_album_idx ON daily_draws (album_id);
