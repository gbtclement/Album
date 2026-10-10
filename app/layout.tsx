import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Lilita_One, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { indexingEnabled, siteUrl } from "@/lib/seo";
import "./globals.css";

// Polices du jeu : titres et chiffres (Lilita One), interface (Chakra Petch), texte (Nunito)
const lilita = Lilita_One({ weight: "400", subsets: ["latin"], variable: "--font-lilita", display: "swap" });
const chakra = Chakra_Petch({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-chakra", display: "swap" });
const nunito = Nunito({ weight: ["400", "600", "700", "800"], subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#15122a",
  colorScheme: "dark",
  viewportFit: "cover",
};

// Tout le site est rendu à chaque requête : les pages lisent la session, la base,
// et les variables d'environnement (URL publique, indexation) fournies au lancement du conteneur,
// pas au moment du build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Album",
    template: "%s | Album",
  },
  description: "Collectionne des albums de musique, ouvre des packs et échange avec tes amis.",
  applicationName: "Album",
  openGraph: {
    siteName: "Album",
    locale: "fr_FR",
    type: "website",
  },
  robots: {
    index: indexingEnabled(),
    follow: indexingEnabled(),
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${lilita.variable} ${chakra.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
