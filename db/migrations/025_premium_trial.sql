-- Lot PAY1 : le premier mois offert ne sert qu'une fois par compte.
-- premium_trial_used_at : date du premier premium du compte (essai, abonnement ou premium offert). Rempli = plus de mois offert.
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_trial_used_at timestamptz;

-- Comptes déjà passés premium avant cette migration
UPDATE users SET premium_trial_used_at = now() WHERE premium_until IS NOT NULL AND premium_trial_used_at IS NULL;
