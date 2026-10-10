import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { listFriends, listIncomingRequests, listOutgoingRequests } from "@/lib/friends";
import { removeFriendAction, respondFriendRequestAction, sendFriendRequestAction } from "./actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AmisPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message } = await searchParams;
  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(userId),
    listIncomingRequests(userId),
    listOutgoingRequests(userId),
  ]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <h1 className="text-2xl font-semibold">Amis</h1>

        {message && <p role="status" className="rounded-lg bg-zinc-100 px-4 py-3 text-sm">{message}</p>}

        <section>
          <h2 className="mb-3 font-semibold">Ajouter un ami</h2>
          <form action={sendFriendRequestAction} className="flex flex-wrap gap-2">
            <input name="pseudo" required minLength={3} placeholder="Pseudo du joueur" className="rounded-lg border border-zinc-300 px-3 py-2" />
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700">Envoyer la demande</button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Demandes reçues ({incoming.length})</h2>
          {incoming.length === 0 && <p className="text-sm text-zinc-500">Aucune demande en attente.</p>}
          <ul className="space-y-2">
            {incoming.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3">
                <span className="font-medium">{request.pseudo}</span>
                <div className="flex gap-2">
                  <form action={respondFriendRequestAction}>
                    <input type="hidden" name="requesterId" value={request.id} />
                    <button name="decision" value="accept" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white">Accepter</button>
                  </form>
                  <form action={respondFriendRequestAction}>
                    <input type="hidden" name="requesterId" value={request.id} />
                    <button name="decision" value="decline" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">Refuser</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Demandes envoyées ({outgoing.length})</h2>
          {outgoing.length === 0 && <p className="text-sm text-zinc-500">Aucune demande envoyée.</p>}
          <ul className="space-y-2">
            {outgoing.map((request) => (
              <li key={request.id} className="rounded-lg border border-zinc-200 px-4 py-3 text-zinc-600">{request.pseudo}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Mes amis ({friends.length})</h2>
          {friends.length === 0 && <p className="text-sm text-zinc-500">Tu n&apos;as pas encore d&apos;amis.</p>}
          <ul className="space-y-2">
            {friends.map((friend) => (
              <li key={friend.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3">
                <span className="font-medium">{friend.pseudo}</span>
                <div className="flex gap-3 text-sm">
                  <Link href={`/echanges/nouveau?avec=${friend.id}`} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white">
                    Proposer un échange
                  </Link>
                  <form action={removeFriendAction}>
                    <input type="hidden" name="friendId" value={friend.id} />
                    <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5">Retirer</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
