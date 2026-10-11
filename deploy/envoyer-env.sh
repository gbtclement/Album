#!/usr/bin/env bash
# Envoie les réglages de production (.env.prod, préparé sur ton ordinateur) au serveur,
# puis relance l'application pour qu'elle les prenne en compte.
#
#   deploy/envoyer-env.sh utilisateur@serveur            (dossier du site sur le serveur : ~/Album)
#   deploy/envoyer-env.sh utilisateur@serveur /srv/musicodex
#
# Le fichier passe par SSH (chiffré) et n'est lisible que par ton utilisateur sur le serveur.
set -euo pipefail

SERVER="${1:?Indique le serveur, ex. deploy/envoyer-env.sh clement@musicodex.fr}"
DIR="${2:-~/Album}"
cd "$(dirname "$0")/.."

[ -f .env.prod ] || { echo "Pas de fichier .env.prod ici : copie .env.example en .env.prod et remplis-le." >&2; exit 1; }

scp -q .env.prod "$SERVER:$DIR/.env.prod"
ssh "$SERVER" "cd $DIR && chmod 600 .env.prod && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d"
echo "Réglages envoyés et application relancée sur $SERVER."
