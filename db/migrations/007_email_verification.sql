-- Correctif 5 : vérification de l'adresse e-mail et invalidation des sessions
-- Appliquée automatiquement sur une base neuve, sinon à lancer à la main : voir CLAUDE.md.

-- Date de vérification de l'e-mail (NULL tant que le joueur n'a pas cliqué sur le lien)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
-- Incrémenté pour déconnecter toutes les sessions du joueur (reprise du compte par Google)
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

-- Les comptes créés avec Google ont une adresse vérifiée par Google
UPDATE users SET email_verified_at = created_at
WHERE password_hash IS NULL AND email_verified_at IS NULL;

-- Un seul lien de vérification en cours par joueur. Seule l'empreinte (SHA-256) du jeton est gardée :
-- une fuite de la base ne permet pas de valider une adresse.
CREATE TABLE IF NOT EXISTS email_verifications (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
