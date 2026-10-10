import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Accueil",
  description: "Album : ouvre des packs d'albums de musique, collectionne-les, échange-les avec tes amis et suis la bourse du marché.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Un joueur connecté arrive directement dans sa collection
  const session = await auth();
  if (session?.user?.id) redirect("/collection");

  return (
    <main className="landing">
      <div>
        <div className="big-pack">
          <div className="disc">
            <div className="disc-rot"><span className="hub" /></div>
            <span className="sheen" />
          </div>
        </div>
        <h1>Album</h1>
        <p>Ouvre des packs, collectionne les albums qui ont marqué la musique, échange-les avec tes amis et grimpe au classement.</p>
        <div className="pack-actions">
          <Link href="/inscription" className="btn lg gold">Créer un compte</Link>
          <Link href="/connexion" className="btn lg alt">Se connecter</Link>
        </div>
      </div>
    </main>
  );
}
