# Passe de combat, packs Épique/Légendaire et premium — conception

Date : 11 octobre 2026. Statut : à relire par Clément.

## Objectif

Donner aux joueurs un objectif mensuel : chaque carte obtenue rapporte de l'XP selon sa rareté, l'XP fait monter
des paliers, chaque palier donne une récompense. Deux lignes de récompenses : gratuite pour tous, premium pour les
abonnés. Deux nouveaux packs (Épique, Légendaire) servent de grosses récompenses.

Contrainte forte : **l'économie de pièces doit rester stable** (hypothèse de 1 000 joueurs actifs). Les pièces ne
viennent que des quêtes, des sets d'artiste et des succès ; le passe n'en donne pas.

## Découpage

- **Lot P1** : packs Épique et Légendaire, statut premium (sans paiement) et stock de 15, taxe de 5 % sur le marché.
- **Lot P2** : passe de combat (XP, saisons, paliers, page `/passe`, jauge dans la barre du haut).

P2 dépend de P1 (récompenses en packs Épique/Légendaire, ligne premium).

Hors périmètre (noté pour plus tard) : paiement réel de l'abonnement (Stripe, CGV, rétractation, factures, TVA,
résiliation en un clic) ; boutique où l'on dépense des pièces contre des packs (deuxième puits de pièces si
l'inflation se voit malgré la taxe).

## Lot P1

### Packs Épique et Légendaire

- 5 cartes. Le pack Épique contient au moins 1 carte épique garantie, le Légendaire au moins 1 légendaire
  garantie. Les 4 autres cartes suivent `PACK_RATES`.
- La carte garantie est tirée avec `pickAlbum(client, "epique" | "legendaire")` (repli sur les paliers voisins si le
  palier est vide, comme aujourd'hui).
- `PackKind` devient `"classic" | "solo" | "epic" | "legendary"`. Taille : `PACK_SIZE` pour classic, epic et
  legendary, `SOLO_PACK_SIZE` pour solo.
- Réserve : `pack_stocks.epic_packs` et `pack_stocks.legendary_packs` (entiers ≥ 0, sans maximum). `grantPacks`
  accepte `epic` et `legendary`. `PackState` expose `epic` et `legendary`. `Reward` et `rewardLabel` connaissent ces
  packs.
- Quêtes « Ouvre N packs » : tous les packs de 5 cartes comptent (classic, epic, legendary), pas les Solo.
- Page Packs : un bouton d'ouverture par type de pack possédé, comme pour les Solo. Chaque type a sa couleur
  (violet épique, or légendaire, reprises des couleurs de rareté).

### Premium (sans paiement)

- `users.premium_until timestamptz` (null = jamais premium). Premium si `premium_until > now()`.
- Commande `npm run premium -- <email> <jours>` (`scripts/premium.ts`) : prolonge de N jours à partir de
  `max(now(), premium_until)` ; `0` retire le premium. Affiche la nouvelle date.
- Avantage P1 : **stock de 15 packs** au lieu de 10 (`MAX_STOCK_PREMIUM = 15`). `rechargeStock` lit le statut
  premium du joueur. Si le premium expire avec plus de 10 packs en stock, le joueur les garde ; la recharge reprend
  quand il redescend sous 10.
- Profil : mention « Premium jusqu'au JJ/MM/AAAA » quand le joueur est premium.

### Taxe du marché

- Sur une vente contre des pièces : l'acheteur paie le prix affiché, le vendeur reçoit
  `prix − floor(prix × 5 %)`. La différence disparaît du jeu. (Un prix sous 20 pièces n'est donc pas taxé.)
- `MARKET_FEE_RATE = 0.05` dans un fichier de règles sans base (utilisable côté client).
- Formulaire de mise en vente : « Tu recevras X pièces (taxe de 5 %) », recalculé à la saisie.
- `market_sales` garde le prix payé par l'acheteur (la Bourse ne change pas).
- Les échanges directs entre joueurs ne sont pas taxés.
- CGU : la taxe est mentionnée.

## Lot P2 : passe de combat

### XP

| Rareté | XP |
|---|---|
| Commun | 10 |
| Peu commun | 20 |
| Rare | 50 |
| Épique | 120 |
| Légendaire | 300 |

- Toutes les cartes obtenues rapportent de l'XP : packs du stock, packs gagnés (classiques, Solo, Épique,
  Légendaire) et carte de la pioche du jour quand elle est trouvée. Les cartes achetées au marché ou reçues en
  échange n'en rapportent pas.
- L'XP est ajoutée dans la même transaction que l'ouverture ou la pioche (`addPassXp(client, userId, tiers)`), donc
  sans doublon possible.
- Pas de bonus d'XP pour le premium.

### Saisons et paliers

- Une saison = un mois calendaire UTC, identifiée par son premier jour (comme les quêtes mensuelles,
  `periodStart("monthly")`).
- 30 paliers, 1 000 XP chacun : palier atteint = `min(30, floor(xp / 1000))`. L'XP continue de compter après 30
  mais ne donne plus rien.
- Repères : un pack classique rapporte environ 95 XP en moyenne. Dix packs par jour finissent le passe vers le 25
  du mois.

### Récompenses (uniquement des packs, jamais de pièces)

| Paliers | Ligne gratuite | Ligne premium |
|---|---|---|
| 1-4, 6-9, 11-14, 16-19, 21-24, 26-29 | 1 pack Solo | 1 pack classique |
| 5, 25 | 1 pack classique | 2 packs classiques |
| 10, 20 | 1 pack classique | 1 pack Épique |
| 15 | 1 pack Épique | 2 packs classiques |
| 30 | 1 pack Épique | 1 pack Légendaire |

Sur une saison complète : gratuite 24 Solo, 4 classiques, 2 Épiques ; premium en plus 30 classiques, 2 Épiques,
1 Légendaire. Le tableau est une constante (`PASS_REWARDS` dans `lib/pass-rules.ts`), modifiable sans migration.

### Réclamation

- Chaque palier atteint se réclame une fois par ligne (bouton « Réclamer », ou « Tout réclamer »).
- La ligne premium se réclame seulement si le joueur est premium au moment de la réclamation. Devenir premium en
  cours de mois débloque les paliers premium déjà atteints.
- Fin de saison : à la première visite d'une saison suivante, les paliers atteints et non réclamés des saisons
  précédentes sont versés automatiquement (ligne premium seulement si `premium_until` couvrait la fin de cette
  saison). Un message l'annonce une fois (« Saison terminée : N récompenses ajoutées à tes packs »).
- Concurrence : la réclamation insère la ligne `(user, season, tier, track)` avec `on conflict do nothing` et ne
  verse les packs que si la ligne est nouvelle.

### Données

- `pass_progress (user_id, season date, xp int, primary key (user_id, season))`.
- `pass_claims (user_id, season date, tier smallint, track text check in ('free','premium'), auto boolean,
  claimed_at, primary key (user_id, season, tier, track))`.
- Clés étrangères vers `users` en `ON DELETE CASCADE`, tables ajoutées à `USER_TABLES` et à `exportUserData`
  (clé « passe_de_combat »). `premium_until` est exporté avec le compte.

### Écrans

- Barre du haut : jauge compacte « Niv. N » à côté des pièces (anneau de progression vers le palier suivant),
  pastille quand un palier est à réclamer. Lien vers `/passe`.
- Page `/passe` (privée, ajoutée à `PRIVATE_PATHS`) :
  - niveau, barre d'XP du palier en cours, temps restant dans la saison ;
  - 30 paliers en colonnes défilant horizontalement, ligne gratuite en haut, ligne premium en bas ;
  - palier atteint : bouton « Réclamer » ; réclamé : coche ; non atteint : grisé ; ligne premium d'un joueur
    non premium : cadenas ;
  - « Tout réclamer » ; rappel du barème d'XP par rareté.
- Style jeu, animations sobres, utilisable à 390 px de large.

## RGPD et documentation

- `/confidentialite` : statut premium (date de fin) et progression du passe ; `LEGAL_UPDATED_AT` mis à jour.
- CGU : passe de combat, premium (gratuit pour l'instant, attribué à la main), taxe du marché.
- `/documentation` : règles, tables, commande `premium`, lots P1 et P2. `CLAUDE.md` : commande `premium`.

## Tests

P1 :
- un pack Épique (ou Légendaire) contient 5 cartes dont au moins une de ce palier ; il compte pour les quêtes
  d'ouverture ; refus sans pack ;
- stock de 15 en premium, 10 sinon ; premium expiré avec 15 en stock : rien de perdu, pas de recharge au-dessus
  de 10 ;
- commande premium : prolonge, retire ;
- vente au marché : le vendeur reçoit le prix moins 5 %, l'acheteur paie le prix, total des pièces diminué de la
  taxe ;
- export et suppression couvrent les nouvelles colonnes.

P2 :
- XP selon la rareté pour chaque source (pack du stock, pack gagné, Solo, Épique, pioche trouvée) ; pas d'XP pour
  une pioche ratée ;
- palier calculé et plafonné à 30 ;
- réclamation unique, même avec deux demandes simultanées ; refus d'un palier non atteint ; refus premium pour un
  non-premium ;
- versement automatique de la saison précédente, premium seulement si le premium couvrait la fin de saison ;
- tables du passe présentes dans `USER_TABLES` et en `ON DELETE CASCADE` (test existant).
- Vérification dans un vrai navigateur (Playwright, 390 px) : jauge, page `/passe`, réclamation.
