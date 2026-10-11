// Offre premium affichée sur /premium (lot PAY1). Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
// Le prix réellement payé est celui du prix Stripe STRIPE_PRICE_PREMIUM : garder les deux identiques.

export const PREMIUM_PRICE_CENTS = 299;

// « 2,99 € »
export function formatEuros(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}
