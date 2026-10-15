-- Pioche du jour en 3 essais (lot PIO3) : chaque mauvaise réponse élargit le morceau de pochette montré.
-- round : plusieurs pioches le même jour, seulement en développement avec DRAW_REPLAY=1 (toujours 1 en production).

ALTER TABLE daily_draws ADD COLUMN IF NOT EXISTS round integer NOT NULL DEFAULT 1;
-- Mauvaises réponses déjà données (titres), dans l'ordre ; leur nombre fixe la taille du morceau montré
ALTER TABLE daily_draws ADD COLUMN IF NOT EXISTS wrong_guesses text[] NOT NULL DEFAULT '{}';

ALTER TABLE daily_draws DROP CONSTRAINT IF EXISTS daily_draws_pkey;
ALTER TABLE daily_draws ADD PRIMARY KEY (user_id, draw_date, round);
