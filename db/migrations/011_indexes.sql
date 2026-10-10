-- Lot D5 : index pour les listes paginées et les pages publiques
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

-- Marché : annonces actives triées par date ou par prix (pages de 24), et « Mes annonces »
CREATE INDEX IF NOT EXISTS listings_active_created_idx ON listings (created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS listings_active_price_idx ON listings (price_coins) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS listings_active_seller_idx ON listings (seller_id) WHERE status = 'active';

-- Bourse et indice du marché : ventes des N derniers jours
CREATE INDEX IF NOT EXISTS market_sales_created_idx ON market_sales (created_at);

-- Fiche album : autres albums du même artiste
CREATE INDEX IF NOT EXISTS albums_artist_idx ON albums (artist);
