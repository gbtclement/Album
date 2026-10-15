-- Recherche de la pioche du jour (« le titre contient… ») : index trigramme pour ne plus parcourir tout le catalogue
-- à chaque lettre tapée (lot PERF1). Utilisé dès 3 caractères ; pg_trgm est livré avec l'image PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS albums_title_trgm_idx ON albums USING gin (title gin_trgm_ops);
