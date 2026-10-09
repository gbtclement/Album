# Album — instructions pour Claude

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Interface en français.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) : pages et API dans `app/`
- PostgreSQL (`lib/db.ts`) et Redis (`lib/redis.ts`), tous deux dans Docker
- Tailwind CSS 4
- Auth.js (lot 1), Lightweight Charts (lot 6)

Next.js 16 a des changements par rapport aux versions habituelles : lire le guide correspondant dans `node_modules/next/dist/docs/` avant d'écrire du code.

## Commandes

- Lancer le projet : `docker compose up -d` (puis http://localhost:3000)
- Voir les logs : `docker compose logs -f app`
- Arrêter : `docker compose down`
- Vérifier la santé : http://localhost:3000/api/health (200 si la base et Redis répondent)

Le projet tourne uniquement dans Docker : Node n'est pas installé sur la machine Windows.

## Branches

- `dev` : développement local
- `preprod` : recette avant production
- `prod` : version en ligne
- Chaque lot a sa branche (`lot0-socle`, `lot1-auth`, ...) qui part de `dev`, puis passe par une PR vers `dev`.

## Règles

- Ne jamais versionner `.env`. Les variables sont décrites dans `.env.example`.
- Ne jamais afficher les secrets (`.env`, mots de passe, clés API) dans une réponse.
- Style : rester sobre pour l'instant. Le seul design travaillé est la page de connexion/inscription (lot 1) ; on répliquera ce style sur le reste du site une fois validé.
- SEO : chaque page publique définit son titre, sa description et son URL canonique (à partir de `PUBLIC_BASE_URL`).
