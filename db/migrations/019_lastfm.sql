-- Écoutes Last.fm (lot C12) : affichées sur la fiche album, plus parlantes que celles de ListenBrainz
-- (communauté bien plus grande). La rareté reste calculée avec ListenBrainz.
-- lastfm_checked_at : date de la dernière recherche, même sans résultat (pour ne pas la refaire à chaque fois)
ALTER TABLE albums ADD COLUMN IF NOT EXISTS lastfm_playcount bigint;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS lastfm_listeners bigint;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS lastfm_checked_at timestamptz;
