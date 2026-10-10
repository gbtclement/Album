// Page où renvoyer le joueur après sa connexion (paramètre `callbackUrl`).
// Seuls les chemins internes au site sont acceptés : une adresse externe (https://..., //site.com)
// permettrait d'envoyer un joueur vers un faux site juste après qu'il s'est connecté.
export const DEFAULT_AFTER_LOGIN = "/profil";

export function safeCallbackUrl(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_LOGIN;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  // Pas de retour vers les pages de connexion elles-mêmes
  if (/^\/(connexion|inscription)(\/|\?|$)/.test(value)) return DEFAULT_AFTER_LOGIN;
  return value;
}
