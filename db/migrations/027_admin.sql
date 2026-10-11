-- Espace admin (lot ADM1)
-- Rôle de chaque compte : « joueur » par défaut, « admin » pour l'espace /admin et /documentation.
-- On ne devient admin QUE par la base, aucune page du site ne change ce rôle :
--   update users set role = 'admin' where email = 'adresse@exemple.fr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'joueur';
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('joueur', 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Journal des actions faites depuis l'admin : qui, sur quel compte, quoi, quand.
-- Sans clé étrangère vers users : le journal garde la trace même après la suppression du compte visé
-- (les pseudos sont copiés au moment de l'action).
CREATE TABLE IF NOT EXISTS admin_actions (
  id            bigserial PRIMARY KEY,
  admin_id      uuid NOT NULL,
  admin_pseudo  text NOT NULL,
  target_id     uuid,
  target_pseudo text,
  action        text NOT NULL,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON admin_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_target_idx ON admin_actions (target_id);

-- Détection de triche : les ouvertures de packs d'un joueur, dans l'ordre
CREATE INDEX IF NOT EXISTS pack_openings_user_time_idx ON pack_openings (user_id, opened_at);

-- Acheteur d'une annonce vendue (détection des comptes « mules »). Sans clé étrangère : la suppression d'un
-- compte efface elle-même ces références (lib/account.ts, deleteAccount).
ALTER TABLE listings ADD COLUMN IF NOT EXISTS buyer_id uuid;
CREATE INDEX IF NOT EXISTS listings_buyer_idx ON listings (buyer_id) WHERE buyer_id IS NOT NULL;
