# Album — instructions pour Claude

Jeu de collection de cartes d'albums de musique, inspiré de Wikimaster. Interface en français.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) : pages et API dans `app/`
- PostgreSQL (`lib/db.ts`) et Redis (`lib/redis.ts`), tous deux dans Docker
- Tailwind CSS 4
- Auth.js (e-mail/mot de passe ; Google seulement si `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` sont renseignés), Lightweight Charts (lot 6)

Next.js 16 a des changements par rapport aux versions habituelles : lire le guide correspondant dans `node_modules/next/dist/docs/` avant d'écrire du code.

## Commandes

- Lancer le projet : `docker compose watch` (puis http://localhost:3000). Laisser le terminal ouvert : il recopie chaque fichier modifié dans le conteneur. `docker compose up -d` lance aussi la stack mais sans synchronisation du code.
- Voir les logs : `docker compose logs -f app`
- Arrêter : `docker compose down`
- Vérifier la santé : http://localhost:3000/api/health (200 si la base et Redis répondent)
- Appliquer les migrations sur une base existante (le dossier `db/migrations` n'est lu automatiquement que sur une base neuve) :
  `Get-Content db/migrations/001_users.sql | docker compose exec -T db psql -U album -d album`

Le projet tourne uniquement dans Docker : Node n'est pas installé sur la machine Windows.
- Production (test local) : `docker compose -f docker-compose.prod.yml up -d --build`. Arrêter la dev avant (`docker compose down`), les ports sont les mêmes. Le fichier `.env` n'est jamais copié dans l'image.
- Le code n'est pas monté depuis Windows (un dossier monté provoquait des rechargements en boucle) : l'image `Dockerfile.dev` contient code et dépendances, `docker compose watch` synchronise. Modifier `package.json` reconstruit l'image, modifier `next.config.ts` redémarre le serveur.
- Un fichier créé dans le conteneur (par `next dev`, un script...) ne revient pas sous Windows : la synchronisation va de Windows vers le conteneur seulement.
Après un changement dans `.env`, relancer avec `docker compose up -d app` (et non `restart`) pour que le conteneur relise les variables.
Next.js 16 avec `cacheComponents` : pas de `export const dynamic`. Une page qui lit la configuration à chaque requête appelle `await connection()` dans un composant enveloppé dans `<Suspense>`.

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
