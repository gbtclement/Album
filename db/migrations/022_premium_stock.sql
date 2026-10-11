-- Lot P1 : un compte premium a un stock de 15 packs (10 sinon). La limite en base passe à 15 ;
-- le maximum de chaque joueur est appliqué par le jeu (lib/packs.ts).
ALTER TABLE pack_stocks DROP CONSTRAINT IF EXISTS pack_stocks_stock_check;
ALTER TABLE pack_stocks ADD CONSTRAINT pack_stocks_stock_check CHECK (stock BETWEEN 0 AND 15);
