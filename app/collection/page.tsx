import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
      <main className="game-page coll">
        {/* En-tête : chiffres clés sur une ligne, sans boîte ; un filet sous le titre montre la part du catalogue possédée */}
        <header className="coll-head">
          <h1>Collection</h1>
          <dl className="coll-stats">
            <div><dt>Albums</dt><dd>{formatNumber(cards.length)}<small> / {formatNumber(catalogSize)}</small></dd></div>
            <div><dt>Cartes</dt><dd>{formatNumber(totalCards)}</dd></div>
            <div><dt>Score</dt><dd>{formatNumber(collectionScore(cards))}</dd></div>
            <div><dt>Poussière</dt><dd><span className="dust-i" aria-hidden="true" /> {formatNumber(dust)}</dd></div>
          </dl>
          <div className="coll-meter" role="img" aria-label={`${cards.length} albums sur ${catalogSize} au catalogue`}>
            <i style={{ width: `${catalogSize ? Math.max(0.6, (cards.length / catalogSize) * 100) : 0}%` }} />
          </div>
        </header>

        <nav className="coll-tabs" aria-label="Vues de la collection">
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
            <p className="coll-note">
              <b>{completed}</b> collection{completed > 1 ? "s" : ""} d&apos;artiste terminée{completed > 1 ? "s" : ""} sur{" "}
              <b>{sets.length}</b> commencée{sets.length > 1 ? "s" : ""}
            </p>
            <ArtistSets sets={sets} />
          </>
        ) : (
          <>
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
