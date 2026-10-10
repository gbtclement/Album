-- Quêtes journalières, hebdomadaires et mensuelles (lot 8)

-- Progression d'un joueur sur une quête, pour une période donnée (début de période)
CREATE TABLE IF NOT EXISTS user_quests (
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  quest_key     text NOT NULL,
  period_start  date NOT NULL,
  progress      integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  claimed       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, quest_key, period_start)
);
