import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accueil",
  description: "Album : ouvre des packs d'albums de musique, collectionne-les, échange-les avec tes amis et suis la bourse du marché.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">Album</h1>
      <p className="text-zinc-600">Le jeu de collection d&apos;albums de musique.</p>
      <div className="flex gap-4">
        <Link href="/connexion" className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-100">Se connecter</Link>
        <Link href="/inscription" className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700">Créer un compte</Link>
      </div>
    </main>
  );
}
