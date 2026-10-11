-- Lot R1 : données personnelles (RGPD)
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

-- Date d'acceptation des CGU et de la politique de confidentialité (case cochée à l'inscription,
-- ou bouton Google). Null pour les comptes créés avant ce lot.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Dernière visite, mise à jour au plus une fois par jour : sert à supprimer les comptes inactifs depuis 3 ans
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Date de l'e-mail prévenant que le compte va être supprimé faute de visite
ALTER TABLE users ADD COLUMN IF NOT EXISTS inactivity_notice_at timestamptz;
