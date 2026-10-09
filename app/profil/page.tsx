import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

// Page protégée : sans session, on renvoie vers la connexion
export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
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
  );
}
