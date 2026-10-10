import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { auth } from "@/auth";
import { Price, Thumb } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db";
import { getCollection } from "@/lib/collection";
import { listActiveListings, type ListingView } from "@/lib/market";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";
import { buyListingAction, cancelListingAction } from "./actions";

export const metadata: Metadata = { title: "Marché" };

type Props = {
  searchParams: Promise<{ message?: string; onglet?: string; rarete?: string }>;
};

export default async function MarchePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message, onglet, rarete } = await searchParams;
  const tab = onglet === "mes-annonces" ? "mine" : "buy";
  const tier = RARITY_TIERS.find((value) => value === rarete) ?? null;

  const [listings, mine, balance] = await Promise.all([
    listActiveListings(),
    getCollection(userId, null),
    db.query<{ coins: number }>("select coins from users where id = $1", [userId]),
  ]);
  const coins = balance.rows[0]?.coins ?? 0;
  const owned = new Set(mine.map((item) => item.slug));
  const myListings = listings.filter((listing) => listing.seller_id === userId);
  const others = listings.filter((listing) => listing.seller_id !== userId && (!tier || listing.album_tier === tier));

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <div className="row-between">
          <h1>Marché</h1>
          <Link href="/marche/vendre" className="btn gold">Vendre un album</Link>
        </div>
        <p className="sub">{listings.length - myListings.length} annonce{listings.length - myListings.length > 1 ? "s" : ""} · ventes en pièces ou troc d&apos;albums</p>

        <nav className="seg" aria-label="Onglets du marché">
          <Link href="/marche" aria-current={tab === "buy" ? "page" : undefined}>Acheter</Link>
          <Link href="/marche?onglet=mes-annonces" aria-current={tab === "mine" ? "page" : undefined}>
            Mes annonces{myListings.length > 0 && <b>{myListings.length}</b>}
          </Link>
        </nav>

        {tab === "mine" ? (
          <div className="stack two">
            {myListings.length === 0 ? (
              <p className="empty">Aucune annonce. Touche une carte de ta collection pour la mettre en vente.</p>
            ) : (
              myListings.map((listing) => (
                <ListingRow key={listing.id} listing={listing}>
                  {listing.price_coins !== null && <Price value={listing.price_coins} />}
                  <form action={cancelListingAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <button type="submit" className="btn red">Retirer</button>
                  </form>
                </ListingRow>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="chips">
              <Link href="/marche" className="chip" aria-current={tier === null ? "page" : undefined}>Toutes</Link>
              {[...RARITY_TIERS].reverse().map((value: RarityTier) => (
                <Link key={value} href={`/marche?rarete=${value}`} className="chip" style={{ "--c": `var(--r-${value})` } as CSSProperties} aria-current={tier === value ? "page" : undefined}>
                  <i />
                  {RARITY_LABELS[value]}
                </Link>
              ))}
            </div>
            <div className="stack two">
              {others.length === 0 ? (
                <p className="empty">{tier ? "Aucune annonce pour cette rareté." : "Aucune annonce pour l'instant."}</p>
              ) : (
                others.map((listing) => (
                  <ListingRow key={listing.id} listing={listing}>
                    {listing.price_coins !== null ? (
                      <>
                        <Price value={listing.price_coins} />
                        <form action={buyListingAction}>
                          <input type="hidden" name="listingId" value={listing.id} />
                          <button type="submit" className="btn green" disabled={coins < listing.price_coins}>Acheter</button>
                        </form>
                      </>
                    ) : (
                      <form action={buyListingAction}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="offeredSlug" value={listing.wanted_slug ?? ""} />
                        <button
                          type="submit"
                          className="btn"
                          disabled={!listing.wanted_slug || !owned.has(listing.wanted_slug)}
                          title={listing.wanted_slug && owned.has(listing.wanted_slug) ? undefined : "Il te faut l'album demandé"}
                        >
                          Troquer
                        </button>
                      </form>
                    )}
                  </ListingRow>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function ListingRow({ listing, children }: { listing: ListingView; children: ReactNode }) {
  return (
    <div className="item">
      <Link href={`/album/${listing.album_slug}`} aria-label={listing.album_title}>
        <Thumb cover={listing.album_cover} tier={listing.album_tier} title={listing.album_title} />
      </Link>
      <div className="l">
        <strong>{listing.album_title}</strong>
        <small>
          <span className={`tier-tag tier-${listing.album_tier}`}>{RARITY_LABELS[listing.album_tier]}</span>
          {" · "}
          {listing.price_coins !== null ? `par ${listing.seller_pseudo}` : `contre ${listing.wanted_title}`}
          {listing.cote ? ` · cote ${Number(listing.cote).toLocaleString("fr-FR")}` : ""}
        </small>
      </div>
      <div className="r">{children}</div>
    </div>
  );
}
