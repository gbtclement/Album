-- Réglages du joueur (lot D1, design « version jeu »)
-- auto_reveal : les cartes d'un pack se retournent seules (sinon le joueur les retourne une par une)
-- Appliquée par scripts/migrate.mjs ; écrite pour pouvoir être rejouée sans erreur.

ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_reveal boolean NOT NULL DEFAULT false;
