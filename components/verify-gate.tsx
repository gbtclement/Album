import Link from "next/link";
import { resendVerificationAction } from "@/app/profil/actions";
import { SiteNav } from "@/components/site-nav";

// Affiché à la place du marché et des échanges tant que l'adresse e-mail n'est pas confirmée
// (la règle elle-même est appliquée dans lib/market.ts et lib/trades.ts)
export function VerifyGate({ title, message }: { title: string; message?: string }) {
  return (
    <>
      <SiteNav message={message} />
      <main className="game-page narrow">
        <h1>{title}</h1>
        <div className="notice" style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>Confirme ton adresse e-mail pour accéder au marché et aux échanges.</strong> Clique sur le lien reçu à
            l&apos;inscription. Ça protège le jeu des comptes jetables : les cartes et les pièces ne passent qu&apos;entre de
            vrais joueurs.
          </p>
          <div className="sheet-actions">
            <form action={resendVerificationAction}>
              <button type="submit" className="btn gold block">Renvoyer le lien</button>
            </form>
            <Link href="/bourse" className="btn block">Voir la bourse</Link>
          </div>
        </div>
      </main>
    </>
  );
}
