// Règles du marché. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.

// Taxe sur les ventes contre des pièces : elle disparaît du jeu, pour freiner l'inflation des pièces
export const MARKET_FEE_RATE = 0.05;

export function marketFee(price: number) {
  return Math.floor(price * MARKET_FEE_RATE);
}

export function sellerReceives(price: number) {
  return price - marketFee(price);
}
