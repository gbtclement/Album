import type { Metadata } from "next";
import type { ReactNode } from "react";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
