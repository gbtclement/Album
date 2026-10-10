import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AlbumCard } from "@/components/album-card";
import { SiteNav } from "@/components/site-nav";
import { getCollection, getCollectionTotals } from "@/lib/collection";
import { RARITY_LABELS, RARITY_TIERS, type RarityTier } from "@/lib/rarity";

type Props = {
  searchParams: Promise<{ tier?: string }>;
};

export default async function CollectionPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/connexion");

  const { tier } = await searchParams;
  const selected = RARITY_TIERS.find((value) => value === tier) ?? null;

  const [items, totals] = await Promise.all([
    getCollection(session.user.id, selected),
    getCollectionTotals(session.user.id),
  ]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Collection</h1>
        <p className="mt-1 text-zinc-500">
          {totals.owned} albums sur {totals.total}
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 text-sm">
          <FilterLink href="/collection" active={selected === null} label="Tous" />
          {RARITY_TIERS.map((value: RarityTier) => (
            <FilterLink
              key={value}
              href={`/collection?tier=${value}`}
              active={selected === value}
              label={RARITY_LABELS[value]}
            />
          ))}
        </nav>

        {items.length === 0 ? (
          <p className="mt-8 text-zinc-600">
            Aucun album pour l&apos;instant. Ouvre un <Link href="/packs" className="underline">pack</Link> pour commencer.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            {items.map((item) => (
              <li key={item.slug}>
                <AlbumCard
                  card={{
                    slug: item.slug,
                    title: item.title,
                    artist: item.artist,
                    coverUrl: item.cover_url,
                    tier: item.rarity_tier,
                    count: item.count,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 hover:bg-zinc-100"}`}
    >
      {label}
    </Link>
  );
}
