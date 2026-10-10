-- Table des joueurs (lot 1 : inscription et connexion)
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  pseudo        text NOT NULL,
  -- NULL pour les comptes créés avec Google (pas de mot de passe local)
  password_hash text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Unicité insensible à la casse pour l'e-mail et le pseudo
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_pseudo_key ON users (lower(pseudo));
