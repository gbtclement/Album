# Album

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Ouvre des packs, collectionne des albums, échange-les avec tes amis et sur le marché.

## Lancer le projet en local

Prérequis : Docker Desktop.

1. Copier `.env.example` en `.env` et remplir les valeurs.
2. Lancer les conteneurs : `docker compose up -d`
3. Ouvrir http://localhost:3000
4. Vérifier les services : http://localhost:3000/api/health

Pour arrêter : `docker compose down`

## Branches

- `dev` : développement local
- `preprod` : recette avant mise en production
- `prod` : version en ligne

Pour la suite du développement (lots, conventions, commandes), voir [CLAUDE.md](CLAUDE.md).
