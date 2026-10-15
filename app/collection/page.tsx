import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { formatNumber } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { getArtistSets } from "@/lib/artist-sets";
import { collectionScore, getAlbumsCount, getCollectionCards } from "@/lib/collection";
import { getDust, getPressableSummary } from "@/lib/dust";
import { getWishlist } from "@/lib/wishlist";
import { ArtistSets } from "./artist-sets";
import { CollectionBrowser } from "./collection-browser";
import { PressPanel } from "./press-panel";
import { WishList } from "./wish-list";

export const metadata: Metadata = { title: "Collection" };

type Props = {
  searchParams: Promise<{ message?: string; vue?: string }>;
};

export default async function CollectionPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const { message, vue } = await searchParams;
  const tab = vue === "artistes" ? "artists" : vue === "souhaits" ? "wishes" : "cards";

  const [cards, catalogSize, sets, dust, pressable, wishes] = await Promise.all([
    getCollectionCards(session.user.id),
    getAlbumsCount(),
    getArtistSets(session.user.id),
    getDust(session.user.id),
    getPressableSummary(session.user.id),
    getWishlist(session.user.id),
  ]);
  const wishesOnSale = wishes.filter((wish) => !wish.owned && wish.on_sale > 0).length;
  const totalCards = cards.reduce((sum, card) => sum + card.count, 0);
  const claimable = sets.filter((set) => !set.claimed && set.owned === set.total).length;
  const completed = sets.filter((set) => set.claimed || set.owned === set.total).length;

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Collection</h1>
        <p className="sub">
          {formatNumber(totalCards)} carte{totalCards > 1 ? "s" : ""} · score {formatNumber(collectionScore(cards))}
        </p>

        <nav className="seg" aria-label="Vues de la collection">
          <Link href="/collection" aria-current={tab === "cards" ? "page" : undefined}>Cartes</Link>
          <Link href="/collection?vue=artistes" aria-current={tab === "artists" ? "page" : undefined}>
            Artistes{claimable > 0 && <b>{claimable}</b>}
          </Link>
          <Link href="/collection?vue=souhaits" aria-current={tab === "wishes" ? "page" : undefined}>
            Souhaits{wishesOnSale > 0 && <b>{wishesOnSale}</b>}
          </Link>
        </nav>

        {tab === "wishes" ? (
          <WishList wishes={wishes} dust={dust} />
        ) : tab === "artists" ? (
          <>
            <div className="progress-card">
              <span className="big">{completed}</span>
              <div className="l">
                <strong>collection{completed > 1 ? "s" : ""} d&apos;artiste terminée{completed > 1 ? "s" : ""} sur {sets.length} commencée{sets.length > 1 ? "s" : ""}</strong>
                <div className="bar">
                  <div style={{ width: `${sets.length ? (completed / sets.length) * 100 : 0}%`, "--c": "var(--gold)" } as CSSProperties} />
                </div>
              </div>
            </div>
            <ArtistSets sets={sets} />
          </>
        ) : (
          <>
            <div className="progress-card">
              <span className="big">{cards.length}</span>
              <div className="l">
                <strong>albums différents sur {formatNumber(catalogSize)}</strong>
                <div className="bar">
                  <div style={{ width: `${catalogSize ? (cards.length / catalogSize) * 100 : 0}%`, "--c": "var(--r-rare)" } as CSSProperties} />
                </div>
              </div>
            </div>

            <PressPanel dust={dust} summary={pressable} />

            {cards.length === 0 ? (
              <p className="empty">
                Ta collection est vide. <Link href="/packs" className="btn-link">Ouvre un pack</Link> pour trouver tes premiers albums.
              </p>
            ) : (
              <CollectionBrowser cards={cards} />
            )}
          </>
        )}
      </main>
    </>
  );
}
