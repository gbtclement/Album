import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Avatar } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { db } from "@/lib/db";
import { getCollection } from "@/lib/collection";
import { listFriends } from "@/lib/friends";
import { RARITY_LABELS } from "@/lib/rarity";
import { createTradeAction } from "../actions";

export const metadata: Metadata = { title: "Proposer un échange" };

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
      <SiteNav message={message} />
      <main className="game-page narrow">
        <div className="trade-head" style={{ marginTop: 6 }}>
          <Avatar name={friend.pseudo} />
          <h1 style={{ margin: 0 }}>Échange avec {friend.pseudo}</h1>
        </div>
        <p className="sub" style={{ marginTop: 8 }}>Tu as {balance.rows[0].coins.toLocaleString("fr-FR")} pièces. Ajoute au moins un album ou des pièces de chaque côté.</p>

        <form action={createTradeAction} className="form-grid">
          <input type="hidden" name="receiverId" value={friend.id} />

          <div className="stack two">
            <fieldset className="form-card">
              <legend>Tu donnes</legend>
              <label className="field-label">
                Album
                <select name="offerSlug" defaultValue="">
                  <option value="">Aucun album</option>
                  {mine.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.title} — {RARITY_LABELS[item.rarity_tier]} (x{item.count})</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Pièces
                <input name="offerCoins" type="number" min={0} max={100000} defaultValue={0} />
              </label>
            </fieldset>

            <fieldset className="form-card">
              <legend>Tu demandes</legend>
              <label className="field-label">
                Album de {friend.pseudo}
                <select name="requestSlug" defaultValue="">
                  <option value="">Aucun album</option>
                  {theirs.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.title} — {RARITY_LABELS[item.rarity_tier]}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Pièces
                <input name="requestCoins" type="number" min={0} max={100000} defaultValue={0} />
              </label>
            </fieldset>
          </div>

          <div className="row-between">
            <Link href="/amis" className="btn">Retour aux amis</Link>
            <button type="submit" className="btn gold lg">Envoyer la proposition</button>
          </div>
        </form>
      </main>
    </>
  );
}
