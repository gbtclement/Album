"use client";

import { useEffect } from "react";
import { RecordError } from "@/components/record-error";

// Plantage pendant l'affichage d'une page : « le disque a sauté », avec un bouton pour réessayer.
// Le détail de l'erreur reste dans les logs du serveur (jamais affiché au joueur).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <RecordError
      side="Face B · Piste rayée"
      label="!"
      title="Le disque a sauté"
      text={
        <>
          Un problème est survenu pendant le chargement de cette page. Réessaie : ça suffit souvent.
          {error.digest && <span className="rec-ref">Code de l&apos;erreur : {error.digest}</span>}
        </>
      }
      action={
        <button type="button" onClick={reset} className="btn lg gold">
          Réessayer
        </button>
      }
      tracks={[
        { title: "Accueil", duration: "3:12", href: "/" },
        { title: "Ma collection", duration: "4:05", href: "/collection" },
      ]}
      missing="Page demandée"
      scratched
      alert
    />
  );
}
