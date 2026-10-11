import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/legal-links";
import { LEGAL_UPDATED_AT } from "@/lib/legal";

// Cadre des pages légales (mentions légales, confidentialité, CGU) : texte long et lisible, aux couleurs du jeu
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal">
      <Link href="/" className="legal-back">← Album</Link>
      <h1>{title}</h1>
      <p className="legal-date">Mise à jour : {LEGAL_UPDATED_AT}</p>
      <div className="legal-body">{children}</div>
      <LegalLinks />
    </main>
  );
}
