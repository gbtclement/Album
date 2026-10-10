import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-ui";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Indique ton adresse : tu recevras un lien pour en choisir un nouveau."
      footer={
        <>
          Tu t&apos;en souviens ? <Link href="/connexion">Se connecter</Link>
        </>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
