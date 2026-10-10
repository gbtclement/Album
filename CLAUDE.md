# Album — instructions pour Claude

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Interface en français.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) : pages et API dans `app/`
- PostgreSQL (`lib/db.ts`) et Redis (`lib/redis.ts`), tous deux dans Docker
- Tailwind CSS 4
- Auth.js (e-mail/mot de passe ; Google seulement si `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` sont renseignés), Lightweight Charts (lot 6)

Next.js 16 a des changements par rapport aux versions habituelles : lire le guide correspondant dans `node_modules/next/dist/docs/` avant d'écrire du code.

## Commandes

Toutes les commandes se lancent dans WSL (Ubuntu-24.04), depuis `~/Album`.
- Lancer PostgreSQL et Redis : `docker compose up -d` (ils redémarrent ensuite seuls avec Docker Desktop)
- Lancer le site : `npm run dev` (puis http://localhost:3000). Le terminal affiche les logs. Rechargement à chaud natif.
- Arrêter : Ctrl+C pour le site, `docker compose down` pour la base et Redis
- Vérifier la santé : http://localhost:3000/api/health (200 si la base et Redis répondent)
- E-mails en développement : sans `SMTP_URL`, ils ne sont pas envoyés mais affichés dans le terminal de `npm run dev` (lien de vérification à copier).
- Migrations : appliquées automatiquement par `npm run dev` (et au démarrage du conteneur en production) par `scripts/migrate.mjs` (suivi dans la table `schema_migrations`). À la main : `npm run migrate`. Ne jamais modifier une migration déjà appliquée : ajouter un nouveau fichier numéroté.
- Tests : `npm test` (Vitest). `tests/unit/` sans base ; `tests/integration/` sur la base `album_test` et Redis n°15, vidés à chaque test.
- CI : `.github/workflows/ci.yml` (lint, typage, tests, build) à chaque push et PR.

Environnement : le dépôt vit dans WSL (`~/Album`, jamais sous `C:\`, les accès disque Windows y sont lents et Turbopack y voit de faux changements). Node 22 est installé dans WSL par nvm ; seuls PostgreSQL et Redis tournent dans Docker. En dev, `.env` pointe vers `localhost` ; `docker-compose.prod.yml` remplace ces adresses par `db` et `redis`. Les scripts (`migrate`, `import:catalog`, tests) lisent `.env` eux-mêmes.
- Production (test local) : `docker compose -f docker-compose.prod.yml up -d --build`. Arrêter `npm run dev` et la dev avant (`docker compose down`), les ports sont les mêmes. Le fichier `.env` n'est jamais copié dans l'image.
Après un changement dans `.env`, relancer `npm run dev`.
Next.js 16 sans `cacheComponents` (désactivé : trop de contournements). Le layout racine déclare `export const dynamic = "force-dynamic"` : tout le site est rendu à chaque requête, les variables de `.env` sont lues au lancement et non au build. La session se lit avec `await auth()` (`@/auth`).

## Branches

- `dev` : développement local
- `preprod` : recette avant production
- `prod` : version en ligne
- Chaque lot a sa branche (`lot0-socle`, `lot1-auth`, ...) qui part de `dev`, ou du lot précédent tant qu'il n'est pas fusionné. Puis passage par une PR vers `dev`.

## Règles

- Ne jamais versionner `.env`. Les variables sont décrites dans `.env.example`.
- Ne jamais afficher les secrets (`.env`, mots de passe, clés API) dans une réponse.
- Style : rester sobre pour l'instant. Le seul design travaillé est la page de connexion/inscription (lot 1) ; on répliquera ce style sur le reste du site une fois validé.
- SEO : chaque page publique définit son titre, sa description et son URL canonique (à partir de `PUBLIC_BASE_URL`).
- Documentation : la page `/documentation` (`app/documentation/page.tsx`) décrit le site techniquement (routes, tables, variables d'environnement, règles, avancement des lots). Elle est mise à jour à chaque lot. Elle n'est pas protégée pour l'instant.
