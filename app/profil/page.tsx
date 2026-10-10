import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { getSession } from "@/lib/session";

// Page protégée : sans session, on renvoie vers la connexion
export default async function ProfilPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/connexion");
  }

  return (
    <>
      <SiteNav />
      <main className="flex flex-col items-center justify-center gap-4 p-8 pt-16 text-center">
        <h1 className="text-3xl font-semibold">Bonjour {session.user.pseudo}</h1>
        <p className="text-zinc-600">{session.user.email}</p>
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
