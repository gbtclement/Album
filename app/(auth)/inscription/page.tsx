import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DEFAULT_AFTER_LOGIN, safeCallbackUrl } from "@/lib/callback-url";
import { AuthShell } from "../auth-ui";
import { GoogleOption } from "../google-option";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Crée ton compte Album gratuitement : ouvre des packs d'albums, collectionne-les et échange-les avec tes amis.",
  alternates: { canonical: "/inscription" },
};

type Props = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function InscriptionPage({ searchParams }: Props) {
  const callbackUrl = safeCallbackUrl((await searchParams).callbackUrl);
  // Déjà connecté : rien à faire ici, on renvoie vers la page demandée
  if ((await auth())?.user?.id) redirect(callbackUrl);

  // Le lien vers l'autre formulaire garde la page de destination
  const suffix = callbackUrl === DEFAULT_AFTER_LOGIN ? "" : `?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Ouvre tes premiers packs et lance ta collection."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href={`/connexion${suffix}`}>
            Se connecter
          </Link>
        </>
      }
    >
      <GoogleOption callbackUrl={callbackUrl} />
      <SignupForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
