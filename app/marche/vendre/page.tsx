import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db";
import { getCollection } from "@/lib/collection";
import { RARITY_LABELS } from "@/lib/rarity";
import { createListingAction } from "../actions";

export const metadata: Metadata = { title: "Vendre un album" };

type Props = {
  searchParams: Promise<{ message?: string; album?: string }>;
};

export default async function VendrePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message, album } = await searchParams;
  const [mine, catalogue] = await Promise.all([
    getCollection(userId, null),
    db.query<{ slug: string; title: string; artist: string }>("select slug, title, artist from albums order by lower(title)"),
  ]);
  // Album choisi depuis la fiche de la collection (?album=...)
  const preselected = mine.some((item) => item.slug === album) ? album : "";

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page narrow">
        <h1>Vendre un album</h1>
        <p className="sub">Contre des pièces, ou en troc contre un autre album.</p>

        {mine.length === 0 ? (
          <p className="empty">
            Tu n&apos;as aucun album à vendre. <Link href="/packs" className="btn-link">Ouvre un pack</Link> pour commencer.
          </p>
        ) : (
          <form action={createListingAction} className="form-grid">
            <label className="field-label">
              Album à vendre
              <select name="albumSlug" required defaultValue={preselected}>
                <option value="" disabled>Choisis un album</option>
                {mine.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title} — {RARITY_LABELS[item.rarity_tier]} (x{item.count})
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="form-card">
              <legend>Contre quoi ?</legend>
              <label className="radio">
                <input type="radio" name="mode" value="coins" defaultChecked />
                Des pièces
              </label>
              <input name="price" type="number" min={1} max={100000} placeholder="Prix en pièces" />
              <label className="radio">
                <input type="radio" name="mode" value="swap" />
                Un autre album
              </label>
              <select name="wantedSlug" defaultValue="">
                <option value="">Choisis l&apos;album demandé</option>
                {catalogue.rows.map((row) => (
                  <option key={row.slug} value={row.slug}>{row.title} — {row.artist}</option>
                ))}
              </select>
            </fieldset>

            <div className="row-between">
              <Link href="/marche" className="btn">Retour au marché</Link>
              <button type="submit" className="btn gold lg">Publier l&apos;annonce</button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
