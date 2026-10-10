import { Divider, secondaryButtonClass } from "./auth-ui";
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
        <button type="submit" className={secondaryButtonClass}>
          Continuer avec Google
        </button>
      </form>
      <Divider />
    </>
  );
}
