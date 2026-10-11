"use client";

import { RecordError } from "@/components/record-error";
import "./globals.css";

// Plantage de la mise en page commune elle-même (rare) : cette page remplace tout, <html> compris.
// Les polices du site ne sont pas chargées ici : les polices de secours prennent le relais.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <RecordError
          side="Face B · Piste rayée"
          label="!"
          title="Le disque a sauté"
          text={
            <>
              Le site a rencontré un problème. Réessaie dans un instant.
              {error.digest && <span className="rec-ref">Code de l&apos;erreur : {error.digest}</span>}
            </>
          }
          action={
            <button type="button" onClick={reset} className="btn lg gold">
              Réessayer
            </button>
          }
          tracks={[{ title: "Accueil", duration: "3:12", href: "/" }]}
          missing="Page demandée"
          scratched
          alert
        />
      </body>
    </html>
  );
}
