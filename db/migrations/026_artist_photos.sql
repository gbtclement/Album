-- Photos d'artistes venant de Deezer (onglet Artistes de la collection), remplies par npm run import:photos.
-- Clé : le nom de l'artiste, tel qu'il est écrit dans albums.artist.
-- photo_url NULL = artiste cherché sans résultat sûr (l'initiale reste affichée) ; checked_at évite de le
-- redemander à chaque passage (nouvel essai au bout de 30 jours).
CREATE TABLE IF NOT EXISTS artist_photos (
  artist      text PRIMARY KEY,
  deezer_id   bigint,
  photo_url   text,
  checked_at  timestamptz NOT NULL DEFAULT now()
);
