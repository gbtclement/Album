import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { countAchievements } from "@/lib/achievements";
import { countCards, listFriends, listIncomingRequests, listOutgoingRequests } from "@/lib/friends";
import { removeFriendAction, respondFriendRequestAction, sendFriendRequestAction } from "./actions";

export const metadata: Metadata = { title: "Amis" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const cardsLabel = (count: number) => `${count.toLocaleString("fr-FR")} carte${count > 1 ? "s" : ""}`;
const badgesLabel = (count: number) => `${count} succès`;

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
  const [cards, badges] = await Promise.all([
    countCards([...friends, ...incoming].map((user) => user.id)),
    countAchievements(friends.map((user) => user.id)),
  ]);

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Amis</h1>
        <p className="sub">{friends.length} ami{friends.length > 1 ? "s" : ""} · échange tes cartes avec eux</p>

        <form action={sendFriendRequestAction} className="inline-form">
          <input name="pseudo" type="text" required minLength={3} placeholder="Ajouter un ami par pseudo" aria-label="Pseudo du joueur" autoComplete="off" />
          <button type="submit" className="btn gold">Ajouter</button>
        </form>

        {incoming.length > 0 && (
          <>
            <h2 className="label">Demandes reçues</h2>
            <div className="stack two">
              {incoming.map((request) => (
                <div key={request.id} className="item">
                  <Avatar name={request.pseudo} />
                  <div className="l">
                    <strong>{request.pseudo}</strong>
                    <small>{cardsLabel(cards.get(request.id) ?? 0)}</small>
                  </div>
                  <div className="r">
                    <form action={respondFriendRequestAction}>
                      <input type="hidden" name="requesterId" value={request.id} />
                      <button name="decision" value="decline" className="btn red">Non</button>
                    </form>
                    <form action={respondFriendRequestAction}>
                      <input type="hidden" name="requesterId" value={request.id} />
                      <button name="decision" value="accept" className="btn green">Accepter</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="label">Tes amis</h2>
        <div className="stack two">
          {friends.length === 0 && <p className="empty">Tu n&apos;as pas encore d&apos;amis. Ajoute un joueur avec son pseudo.</p>}
          {friends.map((friend) => (
            <div key={friend.id} className="item">
              <Avatar name={friend.pseudo} />
              <div className="l">
                <strong>{friend.pseudo}</strong>
                <small>{cardsLabel(cards.get(friend.id) ?? 0)}</small>
                <small>{badgesLabel(badges.get(friend.id) ?? 0)}</small>
              </div>
              <div className="r">
                <Link href={`/echanges/nouveau?avec=${friend.id}`} className="btn">Échanger</Link>
                <form action={removeFriendAction}>
                  <input type="hidden" name="friendId" value={friend.id} />
                  <button type="submit" className="btn red" aria-label={`Retirer ${friend.pseudo} de tes amis`}>Retirer</button>
                </form>
              </div>
            </div>
          ))}
        </div>

        {outgoing.length > 0 && (
          <>
            <h2 className="label">Demandes envoyées</h2>
            <div className="stack two">
              {outgoing.map((request) => (
                <div key={request.id} className="item">
                  <Avatar name={request.pseudo} />
                  <div className="l">
                    <strong>{request.pseudo}</strong>
                    <small>En attente de sa réponse</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
