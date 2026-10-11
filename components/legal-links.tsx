import Link from "next/link";

// Liens vers les pages légales, en bas de l'accueil, des pages de connexion et du profil
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Informations légales">
      <Link href="/mentions-legales">Mentions légales</Link>
      <Link href="/confidentialite">Confidentialité</Link>
      <Link href="/cgu">CGU</Link>
      <Link href="/cgv">CGV</Link>
    </nav>
  );
}
