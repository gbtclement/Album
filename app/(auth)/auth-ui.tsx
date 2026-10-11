import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/legal-links";

// Cadre commun des pages connexion et inscription, aux couleurs du jeu (styles .auth* dans globals.css)
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="auth">
      <div className="auth-box">
        <Link href="/" className="auth-logo" aria-label="Musicodex, retour à l'accueil">
          <span className="disc" aria-hidden="true">
            <span className="disc-rot"><span className="hub" /></span>
            <span className="sheen" />
          </span>
          Musicodex
        </Link>
        <h1>{title}</h1>
        <p className="sub">{subtitle}</p>

        <div className="auth-card">{children}</div>

        <p className="auth-footer">{footer}</p>
        <LegalLinks />
      </div>
    </main>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="auth-error">
      {message}
    </p>
  );
}

export function Divider() {
  return <div className="auth-divider">ou</div>;
}
