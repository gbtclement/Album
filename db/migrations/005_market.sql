-- Marché (lot 5)

-- Annonces : soit en vente contre des pièces (price_coins), soit en troc contre un album (wanted_album_id)
CREATE TABLE IF NOT EXISTS listings (
  id               bigserial PRIMARY KEY,
  seller_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  album_id         uuid NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  price_coins      integer CHECK (price_coins IS NULL OR price_coins BETWEEN 1 AND 100000),
  wanted_album_id  uuid REFERENCES albums (id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,
  -- Exactement un mode : pièces ou troc
  CHECK ((price_coins IS NULL) <> (wanted_album_id IS NULL))
);

CREATE INDEX IF NOT EXISTS listings_active_album_idx ON listings (album_id) WHERE status = 'active';

-- Ventes en pièces uniquement : base de la cote de chaque album
CREATE TABLE IF NOT EXISTS market_sales (
  id           bigserial PRIMARY KEY,
  album_id     uuid NOT NULL REFERENCES albums (id) ON DELETE CASCADE,
  price_coins  integer NOT NULL CHECK (price_coins > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_sales_album_time_idx ON market_sales (album_id, created_at DESC);
