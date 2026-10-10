import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { listTrades, type TradeView } from "@/lib/trades";
import { respondTradeAction } from "./actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const STATUS_LABELS: Record<TradeView["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  cancelled: "Annulé",
};

function describe(title: string | null, coins: number) {
  const parts = [title ?? "Aucun album"];
  if (coins > 0) parts.push(`${coins} pièces`);
  return parts.join(" + ");
}

export default async function EchangesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message } = await searchParams;
  const { incoming, outgoing, history } = await listTrades(userId);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Échanges</h1>
          <Link href="/amis" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Proposer un échange</Link>
        </div>

        {message && <p role="status" className="rounded-lg bg-zinc-100 px-4 py-3 text-sm">{message}</p>}

        <section>
          <h2 className="mb-3 font-semibold">Propositions reçues ({incoming.length})</h2>
          {incoming.length === 0 && <p className="text-sm text-zinc-500">Aucune proposition en attente.</p>}
          <ul className="space-y-3">
            {incoming.map((trade) => (
              <li key={trade.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                <p className="text-sm text-zinc-500">De {trade.proposer_pseudo}</p>
                <p className="mt-1">Il te donne : <strong>{describe(trade.offer_title, trade.offer_coins)}</strong></p>
                <p>Il te demande : <strong>{describe(trade.request_title, trade.request_coins)}</strong></p>
                <div className="mt-3 flex gap-2">
                  <form action={respondTradeAction}>
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button name="decision" value="accept" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white">Accepter</button>
                  </form>
                  <form action={respondTradeAction}>
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button name="decision" value="decline" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">Refuser</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Mes propositions en attente ({outgoing.length})</h2>
          {outgoing.length === 0 && <p className="text-sm text-zinc-500">Aucune proposition envoyée.</p>}
          <ul className="space-y-3">
            {outgoing.map((trade) => (
              <li key={trade.id} className="rounded-lg border border-zinc-200 px-4 py-3">
                <p className="text-sm text-zinc-500">À {trade.receiver_pseudo}</p>
                <p className="mt-1">Tu donnes : <strong>{describe(trade.offer_title, trade.offer_coins)}</strong></p>
                <p>Tu demandes : <strong>{describe(trade.request_title, trade.request_coins)}</strong></p>
                <form action={respondTradeAction} className="mt-3">
                  <input type="hidden" name="tradeId" value={trade.id} />
                  <button name="decision" value="cancel" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">Annuler</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Historique</h2>
          {history.length === 0 && <p className="text-sm text-zinc-500">Aucun échange terminé.</p>}
          <ul className="space-y-2 text-sm">
            {history.map((trade) => {
              const iProposed = trade.proposer_id === userId;
              const other = iProposed ? trade.receiver_pseudo : trade.proposer_pseudo;
              return (
                <li key={trade.id} className="rounded-lg border border-zinc-100 px-4 py-2">
                  {STATUS_LABELS[trade.status]} · avec {other} · {describe(trade.offer_title, trade.offer_coins)} contre {describe(trade.request_title, trade.request_coins)}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
