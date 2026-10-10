import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { verifyEmailToken } from "@/lib/email-verification";

// Page ouverte depuis le lien reçu par e-mail : pas d'intérêt pour les moteurs de recherche
export const metadata: Metadata = {
  title: "Vérification de l'adresse e-mail",
  robots: { index: false, follow: false },
};

export default async function VerifierEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const verified = await verifyEmailToken(typeof token === "string" ? token : "");

  return (
    <>
      <SiteNav />
      <main className="flex flex-col items-center justify-center gap-4 p-8 pt-16 text-center">
        <h1 className="text-3xl font-semibold">{verified ? "Adresse e-mail confirmée" : "Lien invalide ou expiré"}</h1>
        <p className="text-zinc-600">
          {verified
            ? "Merci ! Ton adresse est vérifiée."
            : "Ce lien a déjà servi ou n'est plus valable. Tu peux en demander un nouveau depuis ton profil."}
        </p>
        <Link href="/profil" className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-100">
          Aller à mon profil
        </Link>
      </main>
    </>
  );
}
