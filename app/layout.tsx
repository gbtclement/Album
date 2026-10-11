import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Lilita_One, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { preconnect } from "react-dom";
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
    default: "Musicodex",
    template: "%s | Musicodex",
  },
  description: "Collectionne des albums de musique, ouvre des packs et échange avec tes amis.",
  applicationName: "Musicodex",
  category: "games",
  // Les numéros et adresses ne deviennent pas des liens automatiques sur iPhone
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    siteName: "Musicodex",
    locale: "fr_FR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: "Musicodex", statusBarStyle: "black-translucent" },
  robots: {
    index: indexingEnabled(),
    follow: indexingEnabled(),
    googleBot: { index: indexingEnabled(), follow: indexingEnabled(), "max-image-preview": "large" },
  },
  // Preuve de propriété pour Google Search Console (code fourni par Google, à mettre dans .env)
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Les pochettes viennent de Cover Art Archive : la connexion est ouverte dès le début de la page
  preconnect("https://coverartarchive.org");
  return (
    <html lang="fr" className={`${lilita.variable} ${chakra.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
