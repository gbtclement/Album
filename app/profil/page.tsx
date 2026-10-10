import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { auth } from "@/auth";
import { findUserById } from "@/lib/users";
import { resendVerificationAction } from "./actions";

// Page protégée : sans session, on renvoie vers la connexion
export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }
  const user = await findUserById(session.user.id);
  const { message } = await searchParams;

  return (
    <>
      <SiteNav />
      <main className="flex flex-col items-center justify-center gap-4 p-8 pt-16 text-center">
        <h1 className="text-3xl font-semibold">Bonjour {session.user.pseudo}</h1>
        <p className="text-zinc-600">{session.user.email}</p>
        {message && <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm">{message}</p>}
        {user && !user.email_verified_at && (
          <div className="max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              Ton adresse e-mail n&apos;est pas encore vérifiée : clique sur le lien reçu par e-mail. Tant qu&apos;elle ne
              l&apos;est pas, une connexion Google avec cette adresse remplace ton mot de passe.
            </p>
            <form action={resendVerificationAction} className="mt-2">
              <button type="submit" className="underline hover:no-underline">
                Renvoyer le lien
              </button>
            </form>
          </div>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-100">
            Se déconnecter
          </button>
        </form>
      </main>
    </>
  );
}
