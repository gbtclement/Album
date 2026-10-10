import type { Metadata } from "next";
import Link from "next/link";
import { isResetTokenValid } from "@/lib/password-reset";
import { AuthShell } from "../auth-ui";
import { ResetForm } from "./reset-form";

// Page ouverte depuis le lien reçu par e-mail : jamais indexée, et l'adresse (qui contient le jeton)
// n'est pas transmise aux sites externes
export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function NouveauMotDePassePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const valid = await isResetTokenValid(value);

  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle={valid ? "Choisis le mot de passe de ton compte." : "Ce lien a déjà servi ou n'est plus valable."}
      footer={<Link href="/connexion">Retour à la connexion</Link>}
    >
      {valid ? (
        <ResetForm token={value} />
      ) : (
        <div className="auth-form">
          <p className="sub" style={{ margin: 0 }}>Un lien de réinitialisation ne sert qu&apos;une fois et reste valable une heure.</p>
          <Link href="/mot-de-passe-oublie" className="btn gold block">Demander un nouveau lien</Link>
        </div>
      )}
    </AuthShell>
  );
}
