import Link from "next/link";
import { MIN_AGE } from "@/lib/legal";
import { Divider } from "./auth-ui";
import { googleLoginAction } from "./connexion/actions";

// Bouton Google : affiché seulement si les clés sont renseignées dans .env.
// Lu à chaque requête (tout le site est rendu dynamiquement, voir app/layout.tsx).
export async function GoogleOption({ callbackUrl }: { callbackUrl: string }) {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  if (!googleEnabled) return null;

  return (
    <>
      <form action={googleLoginAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button type="submit" className="btn block">
          Continuer avec Google
        </button>
      </form>
      {/* Un premier passage par Google crée le compte : on rappelle ce qui est accepté */}
      <p className="auth-note">
        En continuant avec Google, tu confirmes avoir au moins {MIN_AGE} ans (ou l&apos;accord d&apos;un parent) et accepter les{" "}
        <Link href="/cgu">CGU</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
      <Divider />
    </>
  );
}
