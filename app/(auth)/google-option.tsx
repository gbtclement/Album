import { connection } from "next/server";
import { Divider, secondaryButtonClass } from "./auth-ui";
import { googleLoginAction } from "./connexion/actions";

// Bouton Google : affiché seulement si les clés sont renseignées dans .env.
// Lu à chaque requête, d'où le connection() et le Suspense dans les pages.
export async function GoogleOption() {
  await connection();
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  if (!googleEnabled) return null;

  return (
    <>
      <form action={googleLoginAction}>
        <button type="submit" className={secondaryButtonClass}>
          Continuer avec Google
        </button>
      </form>
      <Divider />
    </>
  );
}
