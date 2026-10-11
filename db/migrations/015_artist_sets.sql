-- Collections d'artiste (lot G2) : chaque artiste d'au moins 3 albums est un set à compléter.
-- La récompense se récupère une seule fois par artiste, même si le set est défait ou agrandi ensuite.

CREATE TABLE IF NOT EXISTS artist_set_rewards (
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  artist      text NOT NULL,
  -- Taille du set et récompense au moment où elle a été récupérée
  set_size    integer NOT NULL,
  coins       integer NOT NULL,
  pack        boolean NOT NULL DEFAULT false,
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artist)
);
