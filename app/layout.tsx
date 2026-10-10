import type { Metadata } from "next";
import type { ReactNode } from "react";
import { indexingEnabled, siteUrl } from "@/lib/seo";
import "./globals.css";

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
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
