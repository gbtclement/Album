-- Amis et échanges directs (lot 4)

-- Amitiés : une seule ligne par paire de joueurs, quel que soit le sens
CREATE TABLE IF NOT EXISTS friendships (
  requester_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key
  ON friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Échanges : le proposeur donne une offre et reçoit une demande.
-- Chaque côté peut être un album, des pièces, ou les deux.
CREATE TABLE IF NOT EXISTS trades (
  id                bigserial PRIMARY KEY,
  proposer_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  receiver_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  offer_album_id    uuid REFERENCES albums (id) ON DELETE SET NULL,
  offer_coins       integer NOT NULL DEFAULT 0 CHECK (offer_coins >= 0),
  request_album_id  uuid REFERENCES albums (id) ON DELETE SET NULL,
  request_coins     integer NOT NULL DEFAULT 0 CHECK (request_coins >= 0),
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  CHECK (proposer_id <> receiver_id),
  CHECK (offer_album_id IS NOT NULL OR offer_coins > 0),
  CHECK (request_album_id IS NOT NULL OR request_coins > 0)
);

CREATE INDEX IF NOT EXISTS trades_receiver_idx ON trades (receiver_id, status);
CREATE INDEX IF NOT EXISTS trades_proposer_idx ON trades (proposer_id, status);
