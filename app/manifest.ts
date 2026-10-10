import type { MetadataRoute } from "next";

// Manifeste : nom, couleurs et icône quand le site est ajouté à l'écran d'accueil d'un téléphone
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Album : le jeu de cartes des albums de musique",
    short_name: "Album",
    description: "Ouvre des packs d'albums, collectionne-les et échange-les avec tes amis.",
    lang: "fr",
    start_url: "/collection",
    display: "standalone",
    orientation: "portrait",
    background_color: "#15122a",
    theme_color: "#15122a",
    categories: ["games", "music", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
