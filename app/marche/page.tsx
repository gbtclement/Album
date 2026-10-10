import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { getCollection } from "@/lib/collection";
import { listActiveListings, type ListingView } from "@/lib/market";
import { buyListingAction, cancelListingAction } from "./actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function MarchePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message } = await searchParams;
  const [listings, mine] = await Promise.all([listActiveListings(), getCollection(userId, null)]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Marché</h1>
          <Link href="/marche/vendre" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Mettre un album en vente</Link>
        </div>

        {message && <p role="status" className="rounded-lg bg-zinc-100 px-4 py-3 text-sm">{message}</p>}

        {listings.length === 0 && <p className="text-zinc-500">Aucune annonce pour l&apos;instant.</p>}

        <ul className="space-y-4">
          {listings.map((listing) => (
            <li key={listing.id} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 sm:flex-row">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                {listing.album_cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.album_cover} alt={`Pochette de ${listing.album_title}`} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/album/${listing.album_slug}`} className="font-medium hover:underline">{listing.album_title}</Link>
                <p className="text-sm text-zinc-500">{listing.album_artist} · vendu par {listing.seller_pseudo}</p>
                <p className="mt-1 text-sm">
                  {listing.price_coins !== null
                    ? <>Prix : <strong>{listing.price_coins} pièces</strong></>
                    : <>Échange contre : <strong>{listing.wanted_title}</strong></>}
                </p>
                <p className="text-xs text-zinc-500">
                  Cote : {listing.cote ? `${listing.cote} pièces` : "pas encore de vente"}
                </p>
              </div>
              <ListingAction listing={listing} myAlbums={mine.map((item) => ({ slug: item.slug, title: item.title }))} viewerId={userId} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}

function ListingAction({
  listing,
  myAlbums,
  viewerId,
}: {
  listing: ListingView;
  myAlbums: Array<{ slug: string; title: string }>;
  viewerId: string;
}) {
  if (listing.seller_id === viewerId) {
    return (
      <form action={cancelListingAction} className="flex items-center">
        <input type="hidden" name="listingId" value={listing.id} />
        <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">Retirer mon annonce</button>
      </form>
    );
  }

  if (listing.price_coins !== null) {
    return (
      <form action={buyListingAction} className="flex items-center">
        <input type="hidden" name="listingId" value={listing.id} />
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Acheter</button>
      </form>
    );
  }

  const candidates = myAlbums.filter((album) => album.slug !== listing.album_slug);
  return (
    <form action={buyListingAction} className="flex flex-col gap-2 text-sm">
      <input type="hidden" name="listingId" value={listing.id} />
      <select name="offeredSlug" required defaultValue="" className="rounded-lg border border-zinc-300 px-2 py-2">
        <option value="" disabled>Ton album à échanger</option>
        {candidates.map((album) => (
          <option key={album.slug} value={album.slug}>{album.title}</option>
        ))}
      </select>
      <button type="submit" disabled={candidates.length === 0} className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">Proposer l&apos;échange</button>
    </form>
  );
}
