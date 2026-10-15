-- Liste de souhaits (lot WISH1) : albums recherchés par un joueur. Pastille sur le Marché quand l'un d'eux est en vente.

CREATE TABLE IF NOT EXISTS wishlist (
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  album_id   uuid NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, album_id)
);

CREATE INDEX IF NOT EXISTS wishlist_album_idx ON wishlist (album_id);
