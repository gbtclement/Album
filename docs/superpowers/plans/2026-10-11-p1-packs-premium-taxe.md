# Lot P1 — packs Épique/Légendaire, premium, taxe du marché : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ajouter les packs Épique et Légendaire (1 carte garantie), un statut premium attribué à la main (stock de 15 packs), et une taxe de 5 % détruite sur les ventes du marché.

**Architecture:** règles pures dans `lib/pack-rules.ts` et un nouveau `lib/market-rules.ts` (utilisables côté client) ; logique en base dans `lib/packs.ts`, `lib/premium.ts`, `lib/market.ts`, toujours dans la transaction de l'action. Une migration `021`. Interface : page Packs, formulaire de vente, profil.

**Tech Stack:** Next.js 16 (App Router, server actions), PostgreSQL (`pg`), Vitest (tests d'intégration sur `album_test`).

**Spec:** `docs/superpowers/specs/2026-10-11-passe-de-combat-design.md` (section « Lot P1 »).

## Global Constraints

- Toutes les commandes dans WSL, depuis `~/Album` ; node via `. ~/.nvm/nvm.sh`.
- Ne jamais modifier une migration existante : nouveau fichier `db/migrations/021_packs_premium.sql`.
- Toute colonne liée au joueur est exportée par `exportUserData` (`lib/account.ts`).
- Styles dans `app/globals.css` avec les variables existantes (`--r-epique`, `--r-legendaire`, `--gold`...), pas d'utilitaires Tailwind.
- Interface en français ; style jeu, animations sobres ; utilisable à 390 px.
- `/documentation` mise à jour (règles, tables, commandes, ligne de lot P1) ; `CLAUDE.md` pour la commande `premium`.
- Commit final terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; jamais `.env`.
- Valeurs : `MAX_STOCK = 10`, `MAX_STOCK_PREMIUM = 15`, `MARKET_FEE_RATE = 0.05`, taxe = `floor(prix × 0,05)`.

## Review Focus

- Premium expiré avec un stock au-dessus de 10 : rien n'est retiré, aucune recharge tant que le stock reste ≥ 10 (test tâche 2).
- Palier épique ou légendaire vide au catalogue : le pack s'ouvre quand même (repli de `pickAlbum`) (test tâche 1).
- Vente à moins de 20 pièces : taxe 0, le vendeur reçoit tout (test tâche 3).
- Commande `premium` avec un e-mail inconnu ou un nombre de jours invalide : message clair, aucune écriture (test tâche 2).
- Demande d'ouverture d'un type de pack inventé envoyé à l'action serveur : refus propre (code tâche 4).

---

### Task 1 : packs Épique et Légendaire

**Files:**
- Create: `db/migrations/021_packs_premium.sql`
- Modify: `lib/pack-rules.ts`, `lib/packs.ts`, `lib/quests.ts:128`
- Test: `tests/integration/packs.test.ts`

**Interfaces:**
- Produces: `PackKind = "classic" | "solo" | "epic" | "legendary"` ; `GUARANTEED_TIER: Partial<Record<PackKind, RarityTier>>` ; `packSize(kind)` ; `PackState` avec `epic` et `legendary` ; `grantPacks(client, userId, { classic?, solo?, epic?, legendary? })` ; `Reward = { coins; packs; solo; epic?; legendary? }`.

- [ ] **Step 1 : migration**

```sql
-- Lot P1 : packs Épique et Légendaire (réserve sans maximum) et statut premium
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS epic_packs integer NOT NULL DEFAULT 0 CHECK (epic_packs >= 0);
ALTER TABLE pack_stocks ADD COLUMN IF NOT EXISTS legendary_packs integer NOT NULL DEFAULT 0 CHECK (legendary_packs >= 0);
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until timestamptz;
```

- [ ] **Step 2 : tests qui échouent** (dans `describe("packs gagnés")`)

```ts
it("un pack Épique contient 5 cartes dont au moins une épique, et compte pour les quêtes d'ouverture", async () => {
  const user = await createTestUser();
  await expect(openPack(user.id, "epic")).rejects.toThrow("pack Épique");
  await withTransaction((client) => grantPacks(client, user.id, { epic: 1, legendary: 1 }));

  const epic = await openPack(user.id, "epic");
  expect(epic.cards).toHaveLength(PACK_SIZE);
  expect(epic.cards.some((card) => card.tier === "epique")).toBe(true);
  const legendary = await openPack(user.id, "legendary");
  expect(legendary.cards.some((card) => card.tier === "legendaire")).toBe(true);
  expect(legendary.state).toMatchObject({ epic: 0, legendary: 0 });

  const { rows } = await db.query<{ progress: number }>(
    "select progress from user_quests where user_id = $1 and quest_key = 'daily_packs'", [user.id]);
  expect(rows[0].progress).toBe(2);
});

it("un pack Légendaire s'ouvre même sans album légendaire au catalogue", async () => {
  await db.query("delete from albums where rarity_tier = 'legendaire'");
  const user = await createTestUser();
  await withTransaction((client) => grantPacks(client, user.id, { legendary: 1 }));
  expect((await openPack(user.id, "legendary")).cards).toHaveLength(PACK_SIZE);
});
```

- [ ] **Step 3 : vérifier l'échec** — `npx vitest run tests/integration/packs.test.ts` → FAIL (type "epic" inconnu / colonne absente).

- [ ] **Step 4 : `lib/pack-rules.ts`**

```ts
export type PackKind = "classic" | "solo" | "epic" | "legendary";
export const SOLO_PACK_SIZE = 1;
// Packs Épique et Légendaire : 5 cartes dont une de ce palier garantie, les autres aux taux habituels
export const GUARANTEED_TIER: Partial<Record<PackKind, RarityTier>> = { epic: "epique", legendary: "legendaire" };
export const PACK_LABELS: Record<PackKind, string> = { classic: "Pack", solo: "Pack Solo", epic: "Pack Épique", legendary: "Pack Légendaire" };
export function packSize(kind: PackKind) {
  return kind === "solo" ? SOLO_PACK_SIZE : PACK_SIZE;
}

export type Reward = { coins: number; packs: number; solo: number; epic?: number; legendary?: number };

// « 1 pack Épique + 1 pack Solo + 100 pièces »
export function rewardLabel({ coins, packs, solo, epic = 0, legendary = 0 }: Reward) {
  const parts: string[] = [];
  if (legendary > 0) parts.push(`${legendary} pack${legendary > 1 ? "s" : ""} Légendaire${legendary > 1 ? "s" : ""}`);
  if (epic > 0) parts.push(`${epic} pack${epic > 1 ? "s" : ""} Épique${epic > 1 ? "s" : ""}`);
  if (packs > 0) parts.push(`${packs} pack${packs > 1 ? "s" : ""}`);
  if (solo > 0) parts.push(`${solo} pack${solo > 1 ? "s" : ""} Solo`);
  if (coins > 0) parts.push(`${coins.toLocaleString("fr-FR")} pièces`);
  return parts.join(" + ");
}
```

- [ ] **Step 5 : `lib/packs.ts`**
  - `PackState` gagne `epic: number; legendary: number`.
  - `rechargeStock` lit `epic_packs, legendary_packs` ; `extra = { bonus, solo, epic: row.epic_packs, legendary: row.legendary_packs }`.
  - `grantPacks` :

```ts
export async function grantPacks(
  client: PoolClient,
  userId: string,
  packs: { classic?: number; solo?: number; epic?: number; legendary?: number },
) {
  const values = [packs.classic ?? 0, packs.solo ?? 0, packs.epic ?? 0, packs.legendary ?? 0];
  if (values.every((value) => value <= 0)) return;
  await client.query(
    `insert into pack_stocks (user_id, bonus_packs, solo_packs, epic_packs, legendary_packs) values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set bonus_packs = pack_stocks.bonus_packs + $2, solo_packs = pack_stocks.solo_packs + $3,
       epic_packs = pack_stocks.epic_packs + $4, legendary_packs = pack_stocks.legendary_packs + $5`,
    [userId, ...values],
  );
}
```

  - `openPack` : consommation selon le type, puis tirage avec carte garantie en premier :

```ts
const RESERVE: Record<"solo" | "epic" | "legendary", { column: string; key: "solo" | "epic" | "legendary"; empty: string }> = {
  solo: { column: "solo_packs", key: "solo", empty: "Tu n'as plus de pack Solo. Les quêtes en rapportent." },
  epic: { column: "epic_packs", key: "epic", empty: "Tu n'as plus de pack Épique." },
  legendary: { column: "legendary_packs", key: "legendary", empty: "Tu n'as plus de pack Légendaire." },
};
// ...
if (kind !== "classic") {
  const reserve = RESERVE[kind];
  if (before[reserve.key] < 1) throw new PackError(reserve.empty);
  await client.query(`update pack_stocks set ${reserve.column} = ${reserve.column} - 1 where user_id = $1`, [userId]);
} else if (before.stock >= 1) { /* inchangé */ } else if (before.bonus >= 1) { /* inchangé */ } else { /* inchangé */ }

const guaranteed = GUARANTEED_TIER[kind];
for (let i = 0; i < packSize(kind); i++) {
  const album = await pickAlbum(client, i === 0 && guaranteed ? guaranteed : drawTier());
  // ... reste inchangé
}
// Quêtes « Ouvre N packs » : seuls les packs de 5 cartes comptent, pas les Solo
if (kind !== "solo") await recordEvent(client, userId, "pack_opened", 1);
```

  - `lib/quests.ts:128` : `grantPacks(client, userId, { classic: quest.reward.packs, solo: quest.reward.solo, epic: quest.reward.epic, legendary: quest.reward.legendary })`.

- [ ] **Step 6 : vérifier** — `npx vitest run tests/integration/packs.test.ts` → PASS ; mettre à jour le test « ne dépasse jamais le maximum » : `toEqual({ stock: MAX_STOCK, nextPackAt: null, bonus: 0, solo: 0, epic: 0, legendary: 0 })`.

### Task 2 : premium et stock de 15

**Files:**
- Create: `lib/premium.ts`, `scripts/premium.ts`, `tests/integration/premium.test.ts`
- Modify: `lib/pack-rules.ts`, `lib/packs.ts` (`rechargeStock`), `package.json`

**Interfaces:**
- Consumes: colonne `users.premium_until` (tâche 1).
- Produces: `MAX_STOCK_PREMIUM = 15` ; `maxStock(premium: boolean)` ; `PackState.max: number` ; `isPremium(userId): Promise<boolean>` ; `getPremiumUntil(userId): Promise<Date | null>` ; `setPremium(email, days): Promise<Date | null>` (lance `PremiumError`).

- [ ] **Step 1 : tests qui échouent** (`tests/integration/premium.test.ts`)

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MAX_STOCK, MAX_STOCK_PREMIUM, PACK_INTERVAL_MS } from "@/lib/pack-rules";
import { getPackState } from "@/lib/packs";
import { isPremium, PremiumError, setPremium } from "@/lib/premium";
import { createTestUser, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

const longAgo = (PACK_INTERVAL_MS / 60_000) * 100;
async function emptyStockSince(userId: string, minutes: number) {
  await db.query(
    `insert into pack_stocks (user_id, stock, last_recharged_at) values ($1, 0, now() - make_interval(mins => $2))
     on conflict (user_id) do update set stock = 0, last_recharged_at = excluded.last_recharged_at`,
    [userId, minutes],
  );
}

describe("premium", () => {
  it("setPremium prolonge à partir de la date de fin, 0 retire le premium", async () => {
    const user = await createTestUser();
    const first = await setPremium(user.email, 30);
    const second = await setPremium(user.email, 30);
    expect(second!.getTime() - first!.getTime()).toBeGreaterThan(29.9 * 86_400_000);
    expect(await isPremium(user.id)).toBe(true);
    expect(await setPremium(user.email, 0)).toBeNull();
    expect(await isPremium(user.id)).toBe(false);
  });

  it("refuse un e-mail inconnu ou un nombre de jours invalide", async () => {
    await expect(setPremium("personne@example.invalid", 30)).rejects.toBeInstanceOf(PremiumError);
    const user = await createTestUser();
    await expect(setPremium(user.email, -1)).rejects.toBeInstanceOf(PremiumError);
    await expect(setPremium(user.email, 1.5)).rejects.toBeInstanceOf(PremiumError);
  });

  it("le stock monte à 15 en premium, 10 sinon", async () => {
    const free = await createTestUser();
    const premium = await createTestUser();
    await setPremium(premium.email, 30);
    await emptyStockSince(free.id, longAgo);
    await emptyStockSince(premium.id, longAgo);
    expect(await getPackState(free.id)).toMatchObject({ stock: MAX_STOCK, max: MAX_STOCK });
    expect(await getPackState(premium.id)).toMatchObject({ stock: MAX_STOCK_PREMIUM, max: MAX_STOCK_PREMIUM });
  });

  it("premium expiré : le stock au-dessus de 10 est gardé, sans recharge", async () => {
    const user = await createTestUser();
    await db.query(
      "insert into pack_stocks (user_id, stock, last_recharged_at) values ($1, 14, now() - interval '1 hour')", [user.id]);
    const state = await getPackState(user.id);
    expect(state).toMatchObject({ stock: 14, max: MAX_STOCK, nextPackAt: null });
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run tests/integration/premium.test.ts` → FAIL (module absent).

- [ ] **Step 3 : `lib/pack-rules.ts`**

```ts
export const MAX_STOCK = 10;
// Premium : stock plus grand (avantage du compte premium, lot P1)
export const MAX_STOCK_PREMIUM = 15;
export function maxStock(premium: boolean) {
  return premium ? MAX_STOCK_PREMIUM : MAX_STOCK;
}
```

- [ ] **Step 4 : `lib/premium.ts`**

```ts
import { db } from "@/lib/db";

// Compte premium (lot P1) : pas encore de paiement, attribué à la main avec npm run premium.
// Premium tant que premium_until est dans le futur.

export class PremiumError extends Error {}

export async function getPremiumUntil(userId: string): Promise<Date | null> {
  const { rows } = await db.query<{ premium_until: Date | null }>(
    "select premium_until from users where id = $1 and premium_until > now()", [userId]);
  return rows[0]?.premium_until ?? null;
}

export async function isPremium(userId: string) {
  return (await getPremiumUntil(userId)) !== null;
}

// Ajoute `days` jours à partir de la fin du premium en cours (ou de maintenant) ; 0 retire le premium.
// Renvoie la nouvelle date de fin (null si retiré).
export async function setPremium(email: string, days: number): Promise<Date | null> {
  if (!Number.isInteger(days) || days < 0) throw new PremiumError("Le nombre de jours doit être un entier positif (0 pour retirer).");
  const { rows } = await db.query<{ premium_until: Date | null }>(
    `update users set premium_until = case when $2::int = 0 then null
       else greatest(now(), coalesce(premium_until, now())) + make_interval(days => $2::int) end
     where lower(email) = lower($1) returning premium_until`,
    [email, days],
  );
  if (rows.length === 0) throw new PremiumError(`Aucun compte avec l'adresse ${email}.`);
  return rows[0].premium_until;
}
```

- [ ] **Step 5 : `lib/packs.ts` — `rechargeStock`** : la requête lit aussi le statut premium, et `MAX_STOCK` devient `max` :

```ts
const { rows } = await client.query<{ stock: number; bonus_packs: number; solo_packs: number; epic_packs: number; legendary_packs: number; last_recharged_at: Date; now: Date; premium: boolean }>(
  `select ps.stock, ps.bonus_packs, ps.solo_packs, ps.epic_packs, ps.legendary_packs, ps.last_recharged_at, now() as now,
          coalesce(u.premium_until > now(), false) as premium
   from pack_stocks ps join users u on u.id = ps.user_id where ps.user_id = $1 for update of ps`,
  [userId],
);
const row = rows[0];
const max = maxStock(row.premium);
const extra = { bonus: row.bonus_packs, solo: row.solo_packs, epic: row.epic_packs, legendary: row.legendary_packs, max };
// puis remplacer chaque MAX_STOCK de la fonction par max
```

`PackState` gagne `max: number` (stock maximum du joueur). Mettre à jour le test « ne dépasse jamais le maximum » avec `max: MAX_STOCK`.

- [ ] **Step 6 : `scripts/premium.ts`** et `package.json` (`"premium": "tsx --env-file-if-exists=.env scripts/premium.ts"`)

```ts
// Compte premium attribué à la main (pas encore de paiement).
//
//   npm run premium -- joueur@exemple.fr 30   -> 30 jours de premium de plus
//   npm run premium -- joueur@exemple.fr 0    -> retire le premium

import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { setPremium } from "@/lib/premium";

async function main() {
  const [email, daysText] = process.argv.slice(2);
  if (!email || daysText === undefined) throw new Error("Usage : npm run premium -- <email> <jours>");
  const until = await setPremium(email, Number(daysText));
  console.log(until ? `${email} est premium jusqu'au ${until.toLocaleString("fr-FR")}.` : `${email} n'est plus premium.`);
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
    redis.disconnect();
  });
```

- [ ] **Step 7 : vérifier** — `npx vitest run tests/integration/premium.test.ts tests/integration/packs.test.ts` → PASS.

### Task 3 : taxe de 5 % sur le marché

**Files:**
- Create: `lib/market-rules.ts`, `app/marche/vendre/price-field.tsx`
- Modify: `lib/market.ts:141-143`, `app/marche/vendre/page.tsx:64`
- Test: `tests/unit/market-rules.test.ts`, `tests/integration/market.test.ts`

**Interfaces:**
- Produces: `MARKET_FEE_RATE = 0.05` ; `marketFee(price: number): number` ; `sellerReceives(price: number): number`.

- [ ] **Step 1 : tests qui échouent**

`tests/unit/market-rules.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { marketFee, sellerReceives } from "@/lib/market-rules";

describe("taxe du marché", () => {
  it("garde 5 % du prix, arrondi à l'unité inférieure", () => {
    expect(marketFee(1000)).toBe(50);
    expect(sellerReceives(1000)).toBe(950);
    expect(marketFee(39)).toBe(1);
    expect(marketFee(19)).toBe(0);
    expect(sellerReceives(1)).toBe(1);
  });
});
```

Dans `tests/integration/market.test.ts`, ajouter (en réutilisant les helpers déjà importés du fichier : `createTestUser`, `createAlbum`, `giveAlbum`, `coinsOf`, `createListing`, `buyListing`) :

```ts
it("le vendeur reçoit le prix moins 5 %, l'acheteur paie le prix : la taxe disparaît", async () => {
  const seller = await createTestUser({ coins: 0 });
  const buyer = await createTestUser({ coins: 1000 });
  const album = await createAlbum();
  await giveAlbum(seller.id, album.id);
  await createListing(seller.id, album.slug, { kind: "coins", price: 1000 });
  const { rows } = await db.query<{ id: string }>("select id from listings where seller_id = $1", [seller.id]);

  await buyListing(buyer.id, rows[0].id, null);

  expect(await coinsOf(buyer.id)).toBe(0);
  expect(await coinsOf(seller.id)).toBe(950);
  const sale = await db.query<{ price_coins: number }>("select price_coins from market_sales");
  expect(sale.rows[0].price_coins).toBe(1000);
});
```

(Adapter le nom et la signature de `createListing` à ceux exportés par `lib/market.ts` : lire l'en-tête du fichier de test existant avant d'écrire.)

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run tests/unit/market-rules.test.ts tests/integration/market.test.ts` → FAIL.

- [ ] **Step 3 : `lib/market-rules.ts`**

```ts
// Règles du marché. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.

// Taxe sur les ventes contre des pièces : elle disparaît du jeu, pour freiner l'inflation des pièces
export const MARKET_FEE_RATE = 0.05;

export function marketFee(price: number) {
  return Math.floor(price * MARKET_FEE_RATE);
}

export function sellerReceives(price: number) {
  return price - marketFee(price);
}
```

- [ ] **Step 4 : `lib/market.ts:142`** — `[listing.seller_id, sellerReceives(listing.price_coins)]` (import depuis `@/lib/market-rules`), avec le commentaire « Le vendeur reçoit le prix moins la taxe du marché (5 %), qui disparaît ».

- [ ] **Step 5 : `app/marche/vendre/price-field.tsx`** (client) et remplacement de l'`<input name="price">` de la page par `<PriceField />`

```tsx
"use client";

import { useState } from "react";
import { formatNumber } from "@/components/game-ui";
import { MARKET_FEE_RATE, sellerReceives } from "@/lib/market-rules";

// Prix de vente, avec ce que le vendeur touchera après la taxe du marché
export function PriceField() {
  const [price, setPrice] = useState("");
  const value = Number(price);
  return (
    <>
      <input name="price" type="number" min={1} max={100000} placeholder="Prix en pièces" value={price} onChange={(event) => setPrice(event.target.value)} />
      <small className="field-hint">
        {Number.isInteger(value) && value > 0
          ? `Tu recevras ${formatNumber(sellerReceives(value))} pièces (taxe du marché : ${MARKET_FEE_RATE * 100} %).`
          : `Le marché garde ${MARKET_FEE_RATE * 100} % du prix de vente.`}
      </small>
    </>
  );
}
```

(Vérifier que `formatNumber` de `components/game-ui` est utilisable côté client ; sinon `toLocaleString("fr-FR")`. Ajouter `.field-hint { color: var(--muted); font-size: 13px; }` dans `app/globals.css` si la classe n'existe pas.)

- [ ] **Step 6 : vérifier** — mêmes tests → PASS.

### Task 4 : écrans (packs, barre du haut, profil)

**Files:**
- Modify: `app/packs/actions.ts`, `app/packs/page.tsx`, `app/packs/pack-opener.tsx`, `lib/hud.ts`, `components/site-nav.tsx`, `components/game-nav.tsx:119`, `app/profil/page.tsx`, `app/globals.css`

**Interfaces:**
- Consumes: `PackState` (`stock, bonus, solo, epic, legendary, max`), `PACK_LABELS`, `getPremiumUntil`.
- Produces: type `Stocks = { stock; bonus; solo; epic; legendary; max }` partagé entre `actions.ts` et `pack-opener.tsx` ; `HudData.max`.

- [ ] **Step 1 : action** — `openPackAction(kind)` : refuser tout `kind` hors `["classic", "solo", "epic", "legendary"]` (« Type de pack inconnu. ») ; renvoyer `stocks: { stock, bonus, solo, epic, legendary, max }`. `page.tsx` passe ces six valeurs.

- [ ] **Step 2 : `pack-opener.tsx`**
  - `Stocks` gagne `epic`, `legendary`, `max` ; « {MAX_STOCK} max » devient `{current.max} max`.
  - Bloc `.pack-stock` : afficher aussi `{n} pack(s) Épique(s)` (`vinyl-i epic`) et `{n} pack(s) Légendaire(s)` (`vinyl-i legendary`) ; condition d'affichage étendue.
  - Boutons : `{current.epic > 0 && <button className="btn lg epic" onClick={() => open("epic")}>Ouvrir un Épique ({current.epic})</button>}` et de même `legendary` (« Ouvrir un Légendaire »), avant le bouton Solo.
  - Titre de l'ouverture : `PACK_LABELS[opening.kind]` ; `left` : `opening.kind === "classic" ? classic : current[opening.kind]` ; bouton « Encore un » : classe `solo`, `epic`, `legendary` ou `gold` selon le type.
  - Texte d'aide : « Un pack contient 5 albums, un pack Solo un seul. Les packs Épique et Légendaire garantissent une carte de leur rareté. »

- [ ] **Step 3 : CSS** (`app/globals.css`, à côté de `.btn.lg.solo` et `.vinyl-i.solo`)

```css
.vinyl-i.epic { border-color: var(--r-epique); }
.vinyl-i.legendary { border-color: var(--r-legendaire); }
.btn.lg.epic { background: var(--r-epique); color: #fff; box-shadow: 0 5px 0 #7a3fb0; }
.btn.lg.legendary { background: linear-gradient(135deg, #ffe08a, var(--gold)); color: #2b1d02; box-shadow: 0 5px 0 var(--gold-deep), 0 0 18px rgba(244,183,64,.45); }
```

- [ ] **Step 4 : barre du haut** — `HudData` gagne `max: number` (`pack.max`) et `extraPacks = bonus + solo + epic + legendary` ; `site-nav.tsx` affiche `{hud.stock}/{hud.max}` (retirer l'import `MAX_STOCK`) ; `Dock` reçoit `max` et `game-nav.tsx:119` utilise `stock >= max`.

- [ ] **Step 5 : profil** — dans `app/profil/page.tsx`, si `getPremiumUntil(userId)` renvoie une date : `<p className="sub">Premium jusqu'au {date.toLocaleDateString("fr-FR")} · stock de 15 packs</p>` près du pseudo.

- [ ] **Step 6 : vérifier** — `npx tsc --noEmit && npm run lint` → 0 erreur.

### Task 5 : RGPD, textes légaux, documentation, vérification et commit

**Files:**
- Modify: `lib/account.ts`, `tests/integration/account.test.ts`, `app/confidentialite/page.tsx`, `app/cgu/page.tsx`, `lib/legal.ts`, `app/documentation/page.tsx`, `CLAUDE.md`, `app/page.tsx:21`

- [ ] **Step 1 : export** — `exportUserData` : compte + `premium_until as premium_jusqu_au` ; packs + `epic_packs as packs_epiques, legendary_packs as packs_legendaires`. Dans `account.test.ts`, vérifier que l'export contient `packs_epiques` et `premium_jusqu_au`.

- [ ] **Step 2 : textes**
  - `/confidentialite` (ligne 39) : « Ta partie : cartes, pièces, packs ouverts et gagnés, quêtes, ... » et ajouter un point « Statut premium : sa date de fin, s'il t'a été attribué. » ; `LEGAL_UPDATED_AT` à la date du jour.
  - CGU section 2 : nouveau paragraphe « Le marché garde 5 % du prix de chaque vente contre des pièces : cette part disparaît du jeu. Les échanges directs entre joueurs ne sont pas taxés. » et « Le statut premium est pour l'instant attribué gratuitement par l'éditeur, sans paiement ; il donne des avantages de jeu (stock de packs plus grand). »
  - Accueil (`app/page.tsx:21`) : inchangé (10 reste vrai pour un compte gratuit).

- [ ] **Step 3 : documentation** — règles (packs Épique/Légendaire, premium et stock de 15, taxe), table `pack_stocks` (colonnes epic_packs, legendary_packs) et `users` (premium_until), commande `npm run premium -- <email> <jours>`, ligne de lot `{ lot: "P1", ..., branch: "passe1-packs-premium" }`, « Paiement de l'abonnement (Stripe, CGV) » dans la liste avant mise en production. `CLAUDE.md` : ligne de commande `premium`.

- [ ] **Step 4 : vérification complète** — `npx tsc --noEmit && npm run lint && npm test` → tout passe.

- [ ] **Step 5 : navigateur** (Playwright, 390 px, compte de test premium avec 1 pack Épique et 1 Légendaire) : boutons visibles, ouverture avec titre « Pack Épique » et carte épique, barre du haut « x/15 », formulaire de vente « Tu recevras 950 pièces » pour 1000, pas de débordement horizontal.

- [ ] **Step 6 : commit et push** sur `passe1-packs-premium`

```bash
git add -A
git commit -m "P1 : packs Épique et Légendaire, premium (stock de 15), taxe de 5 % du marché" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
