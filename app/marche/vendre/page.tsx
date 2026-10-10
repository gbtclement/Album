import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db";
import { getCollection } from "@/lib/collection";
import { createListingAction } from "../actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function VendrePage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message } = await searchParams;
  const [mine, catalogue] = await Promise.all([
    getCollection(userId, null),
    db.query<{ slug: string; title: string; artist: string }>("select slug, title, artist from albums order by lower(title)"),
  ]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Mettre un album en vente</h1>
        <p className="mt-1 text-sm text-zinc-500">Tu peux vendre contre des pièces, ou échanger contre un autre album.</p>

        {message && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}

        {mine.length === 0 ? (
          <p className="mt-8 text-zinc-600">Tu n&apos;as aucun album à vendre. <Link href="/packs" className="underline">Ouvre un pack</Link> pour commencer.</p>
        ) : (
          <form action={createListingAction} className="mt-8 flex flex-col gap-5">
            <label className="flex flex-col gap-1 text-sm">
              Album
              <select name="albumSlug" required defaultValue="" className="rounded-lg border border-zinc-300 px-3 py-2">
                <option value="" disabled>Choisis un album</option>
                {mine.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.title} (x{item.count})</option>
                ))}
              </select>
            </label>

            <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
              <legend className="px-1 text-sm font-semibold">Contre quoi ?</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value="coins" defaultChecked />
                Des pièces
              </label>
              <input name="price" type="number" min={1} max={100000} placeholder="Prix en pièces" className="rounded-lg border border-zinc-300 px-3 py-2" />

              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value="swap" />
                Un autre album
              </label>
              <select name="wantedSlug" defaultValue="" className="rounded-lg border border-zinc-300 px-3 py-2">
                <option value="">Choisis l&apos;album demandé</option>
                {catalogue.rows.map((album) => (
                  <option key={album.slug} value={album.slug}>{album.title} — {album.artist}</option>
                ))}
              </select>
            </fieldset>

            <button type="submit" className="self-start rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700">Publier l&apos;annonce</button>
          </form>
        )}
      </main>
    </>
  );
}
