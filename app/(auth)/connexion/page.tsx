import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DEFAULT_AFTER_LOGIN, safeCallbackUrl } from "@/lib/callback-url";
import { AuthShell } from "../auth-ui";
import { GoogleOption } from "../google-option";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à Musicodex pour ouvrir tes packs et retrouver ta collection d'albums.",
  alternates: { canonical: "/connexion" },
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string; "mot-de-passe"?: string }>;
};

export default async function ConnexionPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  // Déjà connecté : rien à faire ici, on renvoie vers la page demandée
  if ((await auth())?.user?.id) redirect(callbackUrl);

  // Le lien vers l'autre formulaire garde la page de destination
  const suffix = callbackUrl === DEFAULT_AFTER_LOGIN ? "" : `?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouve ta collection d'albums."
      footer={
        <>
          Pas encore de compte ? <Link href={`/inscription${suffix}`}>Créer un compte</Link>
        </>
      }
    >
      {/* Message fixe (pas de texte libre venu de l'adresse) après un changement de mot de passe */}
      {params["mot-de-passe"] === "change" && (
        <p className="auth-success" role="status" style={{ marginBottom: 14 }}>
          Mot de passe changé. Connecte-toi avec le nouveau.
        </p>
      )}
      <GoogleOption callbackUrl={callbackUrl} />
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
