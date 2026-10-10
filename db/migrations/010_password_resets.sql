-- Lot D4 : mot de passe oublié
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

-- Un seul lien de réinitialisation en cours par joueur (un nouveau remplace l'ancien).
-- Seule l'empreinte (SHA-256) du jeton est gardée : une fuite de la base ne permet pas de changer un mot de passe.
CREATE TABLE IF NOT EXISTS password_resets (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
