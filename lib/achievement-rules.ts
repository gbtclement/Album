// Liste des succès. Ce fichier ne dépend pas de la base : il peut être utilisé côté client.
// Un succès se débloque quand la statistique `stat` du joueur atteint `target` ; il ne se reperd jamais.

export type AchievementStat =
  | "albums"
  | "rare"
  | "epic"
  | "legendary"
  | "tiers"
  | "packs"
  | "sets"
  | "friends"
  | "trades"
  | "sales"
  | "draws"
  | "bestStreak";

export type AchievementGroup = "collection" | "rarete" | "packs" | "artistes" | "social" | "pioche";

export type AchievementDef = {
  key: string;
  group: AchievementGroup;
  title: string;
  description: string;
  stat: AchievementStat;
  target: number;
  reward: number;
};

export const GROUP_LABELS: Record<AchievementGroup, string> = {
  collection: "Collection",
  rarete: "Raretés",
  packs: "Packs",
  artistes: "Artistes",
  social: "Social et marché",
  pioche: "Pioche du jour",
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "albums_1", group: "collection", title: "Premier vinyle", description: "Obtiens ton premier album", stat: "albums", target: 1, reward: 50 },
  { key: "albums_100", group: "collection", title: "Collectionneur", description: "Possède 100 albums différents", stat: "albums", target: 100, reward: 300 },
  { key: "albums_500", group: "collection", title: "Discothèque", description: "Possède 500 albums différents", stat: "albums", target: 500, reward: 1000 },
  { key: "albums_1000", group: "collection", title: "Archiviste", description: "Possède 1 000 albums différents", stat: "albums", target: 1000, reward: 2500 },
  { key: "rare_1", group: "rarete", title: "Coup de chance", description: "Possède un album rare ou mieux", stat: "rare", target: 1, reward: 100 },
  { key: "epic_1", group: "rarete", title: "Épique !", description: "Possède un album épique ou légendaire", stat: "epic", target: 1, reward: 200 },
  { key: "legendary_1", group: "rarete", title: "Légende vivante", description: "Possède un album légendaire", stat: "legendary", target: 1, reward: 500 },
  { key: "tiers_5", group: "rarete", title: "Arc-en-ciel", description: "Possède un album de chacune des 5 raretés", stat: "tiers", target: 5, reward: 300 },
  { key: "packs_10", group: "packs", title: "Ouvreur", description: "Ouvre 10 packs", stat: "packs", target: 10, reward: 100 },
  { key: "packs_100", group: "packs", title: "Accro aux packs", description: "Ouvre 100 packs", stat: "packs", target: 100, reward: 500 },
  { key: "packs_500", group: "packs", title: "Usine à vinyles", description: "Ouvre 500 packs", stat: "packs", target: 500, reward: 1500 },
  { key: "sets_1", group: "artistes", title: "Fan inconditionnel", description: "Termine une collection d'artiste", stat: "sets", target: 1, reward: 200 },
  { key: "sets_5", group: "artistes", title: "Mélomane", description: "Termine 5 collections d'artiste", stat: "sets", target: 5, reward: 600 },
  { key: "sets_20", group: "artistes", title: "Encyclopédie", description: "Termine 20 collections d'artiste", stat: "sets", target: 20, reward: 2000 },
  { key: "friends_1", group: "social", title: "Premier ami", description: "Ajoute un ami", stat: "friends", target: 1, reward: 50 },
  { key: "friends_10", group: "social", title: "Bande de potes", description: "Aie 10 amis", stat: "friends", target: 10, reward: 300 },
  { key: "trades_1", group: "social", title: "Troc", description: "Réalise ton premier échange avec un ami", stat: "trades", target: 1, reward: 100 },
  { key: "trades_10", group: "social", title: "Négociateur", description: "Réalise 10 échanges avec des amis", stat: "trades", target: 10, reward: 500 },
  { key: "sales_1", group: "social", title: "Premier client", description: "Vends un album sur le marché", stat: "sales", target: 1, reward: 100 },
  { key: "draws_1", group: "pioche", title: "Œil de lynx", description: "Trouve ta première pioche du jour", stat: "draws", target: 1, reward: 100 },
  { key: "streak_7", group: "pioche", title: "Infaillible", description: "Trouve la pioche 7 jours d'affilée", stat: "bestStreak", target: 7, reward: 500 },
  { key: "draws_30", group: "pioche", title: "Devin", description: "Trouve 30 pioches du jour", stat: "draws", target: 30, reward: 1000 },
];
