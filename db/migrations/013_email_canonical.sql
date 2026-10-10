-- Correctif 10 : un seul compte par boîte mail réelle
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

-- « Vraie » boîte mail d'une adresse : en minuscules, sans ce qui suit un « + » (test+1@x.fr arrive dans la
-- boîte de test@x.fr chez la plupart des fournisseurs). Chez Gmail, les points ne comptent pas non plus
-- (t.e.s.t@gmail.com = test@gmail.com) et googlemail.com est le même service que gmail.com.
-- IMMUTABLE : le résultat ne dépend que de l'adresse, ce qui permet de s'en servir dans une colonne calculée.
CREATE OR REPLACE FUNCTION canonical_email(address text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT CASE
    WHEN domain IN ('gmail.com', 'googlemail.com') THEN replace(local, '.', '') || '@gmail.com'
    ELSE local || '@' || domain
  END
  FROM (
    SELECT regexp_replace(split_part(lower(address), '@', 1), '\+.*$', '') AS local,
           split_part(lower(address), '@', 2) AS domain
  ) AS parts
$$;

-- Calculée et tenue à jour par PostgreSQL : l'application n'a jamais à la remplir
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_canonical text GENERATED ALWAYS AS (canonical_email(email)) STORED;

-- Une deuxième inscription avec test+1@gmail.com ou t.est@gmail.com est refusée comme un doublon
CREATE UNIQUE INDEX IF NOT EXISTS users_email_canonical_key ON users (email_canonical);
