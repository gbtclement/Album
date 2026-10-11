-- Succès (lot G3) : objectifs permanents débloqués une seule fois, avec une petite récompense en pièces.
-- La liste des succès est dans lib/achievements.ts ; la base garde seulement ceux qui sont débloqués.

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key          text NOT NULL,
  reward       integer NOT NULL DEFAULT 0,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- Les succès sont vérifiés à chaque page : index pour compter vite les ventes et les packs ouverts d'un joueur
CREATE INDEX IF NOT EXISTS listings_seller_sold_idx ON listings (seller_id) WHERE status = 'sold';
CREATE INDEX IF NOT EXISTS pack_openings_user_idx ON pack_openings (user_id);
