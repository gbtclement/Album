import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { indexingEnabled, siteUrl } from "@/lib/seo";
import "./globals.css";

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

// Marque le rendu comme dépendant de la requête : les pages lisent la session et la base
async function RequestTime() {
  await connection();
  return null;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Suspense fallback={null}>
          <RequestTime />
          {children}
        </Suspense>
      </body>
    </html>
  );
}
