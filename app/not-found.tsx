import type { Metadata } from "next";
import Link from "next/link";
import { RecordError } from "@/components/record-error";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

// Page 404 : adresse inconnue, ou notFound() (ex. album qui n'existe pas)
export default function NotFound() {
  return (
    <RecordError
      side="Face B · Piste 404"
      label="404"
      title="Cette piste n'est pas sur l'album"
      text="L'adresse est peut-être mal tapée, ou la page a changé de place."
      action={<Link href="/" className="btn lg gold">Retour à l&apos;accueil</Link>}
      tracks={[
        { title: "Ma collection", duration: "4:05", href: "/collection" },
        { title: "Ouvrir un pack", duration: "2:30", href: "/packs" },
        { title: "Pioche du jour", duration: "3:12", href: "/pioche" },
      ]}
      missing="Page demandée"
    />
  );
}
