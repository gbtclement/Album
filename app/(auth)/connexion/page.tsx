import Link from "next/link";
import { AuthShell } from "../auth-ui";
import { GoogleOption } from "../google-option";
import { LoginForm } from "./login-form";

export default function ConnexionPage() {
  return (
    <AuthShell
      title="Connexion"
      subtitle="Retrouve ta collection d'albums."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-amber-300 hover:text-amber-200">
            Créer un compte
          </Link>
        </>
      }
    >
      <GoogleOption />
      <LoginForm />
    </AuthShell>
  );
}
