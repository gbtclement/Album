-- Succès : notification affichée ou non. Un succès peut être débloqué hors de la vue du joueur
-- (liste d'amis d'un autre joueur, page chargée en parallèle) : il est annoncé à sa prochaine page.
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT false;
