import Link from "next/link";
import { AuthShell } from "../auth-ui";
import { GoogleOption } from "../google-option";
import { SignupForm } from "./signup-form";

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Ouvre tes premiers packs et lance ta collection."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-amber-300 hover:text-amber-200">
            Se connecter
          </Link>
        </>
      }
    >
      <GoogleOption />
      <SignupForm />
    </AuthShell>
  );
}
