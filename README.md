# Musicodex

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Ouvre des packs, collectionne des albums, échange-les avec tes amis et sur le marché.

## Lancer le projet en local

Prérequis : Docker Desktop et Node 22. Sous Windows, travailler dans WSL (Ubuntu), le dépôt cloné dans le dossier Linux (`~/Album`).

1. Copier `.env.example` en `.env` et remplir les valeurs.
2. Installer les dépendances : `npm ci`
3. Lancer PostgreSQL et Redis : `docker compose up -d`
4. Lancer le site : `npm run dev` (applique les migrations puis démarre Next.js)
5. Ouvrir http://localhost:3000 et vérifier http://localhost:3000/api/health

Tests : `npm test`. Pour arrêter : Ctrl+C, puis `docker compose down`.

## Branches

- `dev` : développement local
- `preprod` : recette avant mise en production
- `prod` : version en ligne

Pour la suite du développement (lots, conventions, commandes), voir [CLAUDE.md](CLAUDE.md).
