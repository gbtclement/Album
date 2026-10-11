-- Lot P1 : packs Épique et Légendaire (réserve sans maximum) et statut premium
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS epic_packs integer NOT NULL DEFAULT 0 CHECK (epic_packs >= 0);
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS legendary_packs integer NOT NULL DEFAULT 0 CHECK (legendary_packs >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until timestamptz;
