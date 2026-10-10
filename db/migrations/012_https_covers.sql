-- Lot D5 : pochettes en HTTPS
-- Appliquée par scripts/migrate.mjs, comme toutes les migrations (voir CLAUDE.md).

-- Cover Art Archive renvoie parfois des adresses en http:// : sur un site en HTTPS, le navigateur
-- les signale comme contenu non sécurisé. Le même fichier est servi en https://.
UPDATE albums SET cover_url = 'https://' || substr(cover_url, 8) WHERE cover_url LIKE 'http://%';
