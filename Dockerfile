# Image de production : build en plusieurs étapes, exécution en utilisateur non root.
# Le fichier .env n'entre jamais dans l'image (voir .dockerignore) : les secrets sont fournis à l'exécution.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
# Outil de migration : il utilise le module pg déjà présent dans le build autonome
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=builder /app/db/migrations ./db/migrations
USER app
EXPOSE 3000
# Les migrations en attente sont appliquées avant de lancer le serveur
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node server.js"]
