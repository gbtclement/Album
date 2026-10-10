-- Écoutes ListenBrainz (correctif 8) : elles fixent la rareté des albums.
-- Remplacent les statistiques Last.fm, dont l'API ne permet pas de lister les albums les plus écoutés.
-- Appliquée par scripts/migrate.mjs ; écrite pour pouvoir être rejouée sans erreur.

ALTER TABLE albums ADD COLUMN IF NOT EXISTS listen_count bigint;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS listener_count bigint;

-- Reprend les éventuelles statistiques Last.fm avant de supprimer leurs colonnes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'albums' AND column_name = 'lastfm_playcount') THEN
    UPDATE albums SET listen_count = lastfm_playcount, listener_count = lastfm_listeners WHERE listen_count IS NULL;
    ALTER TABLE albums DROP COLUMN lastfm_playcount;
    ALTER TABLE albums DROP COLUMN lastfm_listeners;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS albums_listen_count_idx ON albums (listen_count DESC NULLS LAST);
