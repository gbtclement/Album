import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db";
import { getCollection } from "@/lib/collection";
import { listFriends } from "@/lib/friends";
import { createTradeAction } from "../actions";

type Props = {
  searchParams: Promise<{ avec?: string; message?: string }>;
};

export default async function NouveauEchangePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { avec, message } = await searchParams;
  const friends = await listFriends(userId);
  const friend = friends.find((item) => item.id === avec);
  if (!friend) redirect("/amis?message=" + encodeURIComponent("Tu ne peux échanger qu'avec un ami."));

  const [mine, theirs, balance] = await Promise.all([
    getCollection(userId, null),
    getCollection(friend.id, null),
    db.query<{ coins: number }>("select coins from users where id = $1", [userId]),
  ]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Proposer un échange à {friend.pseudo}</h1>
        <p className="mt-1 text-sm text-zinc-500">Tu as {balance.rows[0].coins} pièces.</p>

        {message && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}

        <form action={createTradeAction} className="mt-8 grid gap-8 md:grid-cols-2">
          <input type="hidden" name="receiverId" value={friend.id} />

          <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 font-semibold">Tu donnes</legend>
            <label className="flex flex-col gap-1 text-sm">
              Album
              <select name="offerSlug" defaultValue="" className="rounded-lg border border-zinc-300 px-3 py-2">
                <option value="">Aucun album</option>
                {mine.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.title} (x{item.count})</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pièces
              <input name="offerCoins" type="number" min={0} max={100000} defaultValue={0} className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 font-semibold">Tu demandes</legend>
            <label className="flex flex-col gap-1 text-sm">
              Album de {friend.pseudo}
              <select name="requestSlug" defaultValue="" className="rounded-lg border border-zinc-300 px-3 py-2">
                <option value="">Aucun album</option>
                {theirs.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.title}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Pièces
              <input name="requestCoins" type="number" min={0} max={100000} defaultValue={0} className="rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
          </fieldset>

          <div className="flex items-center gap-4 md:col-span-2">
            <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700">Envoyer la proposition</button>
            <Link href="/amis" className="text-sm underline">Retour aux amis</Link>
          </div>
        </form>
      </main>
    </>
  );
}
