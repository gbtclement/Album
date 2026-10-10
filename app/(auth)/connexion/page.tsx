import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DEFAULT_AFTER_LOGIN, safeCallbackUrl } from "@/lib/callback-url";
import { AuthShell } from "../auth-ui";
import { GoogleOption } from "../google-option";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function ConnexionPage({ searchParams }: Props) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
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
          Pas encore de compte ?{" "}
          <Link href={`/inscription${suffix}`}>
            Créer un compte
          </Link>
        </>
      }
    >
      <GoogleOption callbackUrl={callbackUrl} />
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
