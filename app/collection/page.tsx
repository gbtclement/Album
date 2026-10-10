import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { formatNumber } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { collectionScore, getAlbumsCount, getCollectionCards } from "@/lib/collection";
import { CollectionBrowser } from "./collection-browser";

export const metadata: Metadata = { title: "Collection" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function CollectionPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const { message } = await searchParams;

  const [cards, catalogSize] = await Promise.all([getCollectionCards(session.user.id), getAlbumsCount()]);
  const totalCards = cards.reduce((sum, card) => sum + card.count, 0);

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Collection</h1>
        <p className="sub">
          {formatNumber(totalCards)} carte{totalCards > 1 ? "s" : ""} · score {formatNumber(collectionScore(cards))}
        </p>
        <div className="progress-card">
          <span className="big">{cards.length}</span>
          <div className="l">
            <strong>albums différents sur {formatNumber(catalogSize)}</strong>
            <div className="bar">
              <div style={{ width: `${catalogSize ? (cards.length / catalogSize) * 100 : 0}%`, "--c": "var(--r-rare)" } as CSSProperties} />
            </div>
          </div>
        </div>

        {cards.length === 0 ? (
          <p className="empty">
            Ta collection est vide. <Link href="/packs" className="btn-link">Ouvre un pack</Link> pour trouver tes premiers albums.
          </p>
        ) : (
          <CollectionBrowser cards={cards} />
        )}
      </main>
    </>
  );
}
