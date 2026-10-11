-- Packs gagnés (lot G4) : réserve à part du stock qui se recharge, sans maximum.
-- bonus_packs = packs classiques (5 albums), solo_packs = packs Solo (1 album)
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS bonus_packs integer NOT NULL DEFAULT 0 CHECK (bonus_packs >= 0);
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS solo_packs integer NOT NULL DEFAULT 0 CHECK (solo_packs >= 0);
