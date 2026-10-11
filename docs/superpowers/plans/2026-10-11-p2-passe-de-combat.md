# Lot P2 — passe de combat : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque carte obtenue rapporte de l'XP selon sa rareté ; 30 paliers par mois, ligne gratuite et ligne premium, récompenses en packs uniquement.

**Architecture:** règles pures dans `lib/pass-rules.ts` (XP, paliers, tableau des récompenses) ; logique en base dans `lib/pass.ts` (ajout d'XP dans la transaction de l'ouverture ou de la pioche, réclamation, versement automatique des saisons passées). Migration `023`. Page `/passe` (serveur + actions) et jauge dans la barre du haut.

**Tech Stack:** Next.js 16 (server actions), PostgreSQL, Vitest, Playwright pour la vérification visuelle.

**Spec:** `docs/superpowers/specs/2026-10-11-passe-de-combat-design.md` (section « Lot P2 »).

## Global Constraints

- XP : commun 10, peu commun 20, rare 50, épique 120, légendaire 300. 1 000 XP par palier, 30 paliers, saison = mois UTC (`periodStart("monthly")`).
- Récompenses : uniquement des packs (jamais de pièces), tableau de la spec recopié tel quel.
- Ligne premium réclamable seulement si premium au moment de la réclamation ; versement automatique des saisons passées, premium seulement si `premium_until >=` fin de la saison.
- Nouvelles tables en `ON DELETE CASCADE`, dans `USER_TABLES` et `exportUserData` (clé `passe_de_combat`).
- `/passe` dans `PRIVATE_PATHS` ; `/confidentialite`, `/documentation` (règles, tables, routes, lot P2) à jour.
- Style jeu, sobre, sans débordement à 390 px.

## Review Focus

- Deux réclamations simultanées du même palier : une seule récompense (test tâche 2).
- Joueur qui n'a pas joué depuis plusieurs mois : toutes les saisons passées versées une seule fois, même si deux pages se chargent en même temps (test tâche 2).
- Pioche du jour ratée : aucune XP (test tâche 1).
- XP au-delà de 30 000 : niveau plafonné à 30, rien de plus à réclamer (test tâche 1).
- Barre du haut à 390 px avec la nouvelle jauge : pas de débordement (Playwright tâche 3).

---

### Task 1 : règles et XP

**Files:** Create `lib/pass-rules.ts`, `db/migrations/023_battle_pass.sql`, `lib/pass.ts` (partie XP), `tests/unit/pass-rules.test.ts`, `tests/integration/pass.test.ts`. Modify `lib/packs.ts` (openPack), `lib/daily-draw.ts` (submitGuess).

**Interfaces (produites):**
- `PASS_XP: Record<RarityTier, number>`, `XP_PER_TIER = 1000`, `PASS_TIERS = 30`
- `type PassTrack = "free" | "premium"`, `type PassReward = { classic?: number; solo?: number; epic?: number; legendary?: number }`
- `PASS_REWARDS: Array<{ tier: number; free: PassReward; premium: PassReward }>` (30 lignes)
- `passLevel(xp: number): number` (0..30), `xpForCards(tiers: RarityTier[]): number`, `passRewardLabel(reward: PassReward): string`, `seasonEnd(season: string): Date`
- `addPassXp(client: PoolClient, userId: string, tiers: RarityTier[]): Promise<void>`

Migration :

```sql
-- Lot P2 : passe de combat. Une ligne d'XP par joueur et par saison (mois), une ligne par palier réclamé.
CREATE TABLE IF NOT EXISTS pass_progress (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season   date NOT NULL,
  xp       integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  -- Saison passée dont les paliers non réclamés ont été versés automatiquement
  settled  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, season)
);
CREATE TABLE IF NOT EXISTS pass_claims (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season     date NOT NULL,
  tier       smallint NOT NULL CHECK (tier BETWEEN 1 AND 30),
  track      text NOT NULL CHECK (track IN ('free', 'premium')),
  auto       boolean NOT NULL DEFAULT false,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season, tier, track)
);
```

Tests unitaires : barème XP ; `passLevel(999) = 0`, `passLevel(1000) = 1`, `passLevel(45_000) = 30` ; totaux du tableau (gratuit 24 Solo, 4 classiques, 2 Épiques ; premium 30 classiques, 2 Épiques, 1 Légendaire) ; aucune pièce.
Tests d'intégration : pack classique ouvert → XP = somme du barème des cartes ; pack Solo et pack gagné rapportent aussi ; pioche réussie → XP de sa rareté, ratée → 0.

Hooks : `openPack` appelle `addPassXp(client, userId, cards.map((card) => card.tier))` ; `submitGuess` appelle `addPassXp(client, userId, [draw.tier])` quand `solved` (lire le champ palier exact renvoyé par `findDraw`).

### Task 2 : état, réclamation, fin de saison

**Files:** `lib/pass.ts`, `tests/integration/pass.test.ts`.

**Interfaces (produites):**
- `type PassState = { season: string; endsAt: Date; xp: number; level: number; premium: boolean; claimed: Set<string> /* "tier:track" */; claimable: number }`
- `getPassState(userId): Promise<PassState>` (lecture seule)
- `settlePastSeasons(userId): Promise<number>` (nombre de récompenses versées)
- `claimPassTier(userId, tier, track): Promise<PassReward>` ; `claimAllPass(userId): Promise<number>` ; `PassError`

Règles : refus palier non atteint, déjà réclamé, ligne premium sans premium. Insertion `on conflict do nothing`, packs versés seulement si la ligne est nouvelle. `settlePastSeasons` : saisons `< saison actuelle` et `not settled`, ligne verrouillée (`for update skip locked`), marquée `settled`.

Tests : réclamation unique (deux appels simultanés) ; refus non atteint / premium ; premium débloque les paliers déjà atteints ; `claimAllPass` ; versement auto d'une saison passée (premium seulement si couvert), deuxième appel → 0 ; deux appels simultanés → une seule fois.

### Task 3 : écrans

**Files:** Create `app/passe/page.tsx`, `app/passe/actions.ts`. Modify `lib/hud.ts` (`passLevel`, `passProgress`, `passReady`, `seasonRewards` + appel `settlePastSeasons`), `components/site-nav.tsx` (pastille ronde « niveau » avec anneau, lien `/passe`, toast « Saison terminée »), `lib/seo.ts`, `app/globals.css`.

Barre du haut : pastille ronde (taille de la pioche) avec anneau `conic-gradient` de la progression du palier et le numéro de niveau ; badge corail si `passReady > 0`. Sous 430 px de large, le texte pseudo/cartes du joueur est masqué (l'avatar reste) pour garder la place.

Page : titre « Passe de combat », niveau + barre XP + « fin de saison dans N j », bouton « Tout réclamer » si `claimable > 0`, grille de 30 colonnes défilant horizontalement (palier, case gratuite, case premium), barème d'XP, encart premium (cadenas) si non premium.

### Task 4 : RGPD, textes, documentation, vérification

**Files:** `lib/account.ts` (`USER_TABLES` + export), `tests/integration/account.test.ts`, `app/confidentialite/page.tsx`, `app/cgu/page.tsx`, `app/documentation/page.tsx`, `CLAUDE.md` si besoin.

Vérification : `tsc`, `lint`, `npm test` complets ; Playwright 390 px (barre du haut, page `/passe`, réclamation, ouverture d'un pack qui fait monter l'XP) ; commit et push sur `passe2-combat`.
