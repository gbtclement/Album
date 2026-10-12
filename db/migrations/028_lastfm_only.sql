-- Catalogue 100 % Last.fm (lot CAT2) : ListenBrainz n'est plus utilisé. Les albums sont trouvés et classés
-- avec leurs écoutes Last.fm ; MusicBrainz ne sert plus qu'à vérifier qu'il s'agit d'un album studio.
DROP INDEX IF EXISTS albums_listen_count_idx;
ALTER TABLE albums DROP COLUMN IF EXISTS listen_count;
ALTER TABLE albums DROP COLUMN IF EXISTS listener_count;

-- Tri des albums les plus écoutés (accueil, fiche artiste, plan du site, suggestions de la pioche)
CREATE INDEX IF NOT EXISTS albums_lastfm_playcount_idx ON albums (lastfm_playcount DESC NULLS LAST);
