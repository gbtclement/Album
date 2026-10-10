import Link from "next/link";
import { auth } from "@/auth";

// Barre de navigation commune aux pages du site
export async function SiteNav() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold">
          Album
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {session?.user ? (
            <>
              <Link href="/packs" className="hover:underline">Packs</Link>
              <Link href="/collection" className="hover:underline">Collection</Link>
              <Link href="/amis" className="hover:underline">Amis</Link>
              <Link href="/echanges" className="hover:underline">Échanges</Link>
              <Link href="/marche" className="hover:underline">Marché</Link>
              <Link href="/profil" className="hover:underline">{session.user.pseudo}</Link>
            </>
          ) : (
            <>
              <Link href="/connexion" className="hover:underline">Connexion</Link>
              <Link href="/inscription" className="hover:underline">Inscription</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
