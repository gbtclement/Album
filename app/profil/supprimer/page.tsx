import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { findUserById } from "@/lib/users";
import { DeleteForm } from "./delete-form";

export const metadata: Metadata = { title: "Supprimer mon compte" };

export default async function SupprimerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const user = await findUserById(session.user.id);
  if (!user) redirect("/connexion");

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Supprimer mon compte</h1>
        <div className="notice danger">
          <p style={{ margin: 0 }}>
            <strong>C&apos;est définitif.</strong> Ta collection, tes pièces, tes packs, tes amis, tes échanges et tes annonces du marché
            seront effacés immédiatement, sans retour possible. Ton pseudo redeviendra libre.
          </p>
        </div>
        <p className="sub">
          Tu veux garder une trace ? <a href="/profil/donnees" download>Télécharge d&apos;abord tes données</a>.
        </p>
        <DeleteForm hasPassword={Boolean(user.password_hash)} />
        <p className="sub" style={{ marginTop: 16 }}>
          <Link href="/profil">Annuler et revenir au profil</Link>
        </p>
      </main>
    </>
  );
}
