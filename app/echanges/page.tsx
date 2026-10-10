import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SwapIcon } from "@/components/icons";
import { Avatar, Thumb } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { VerifyGate } from "@/components/verify-gate";
import { isEmailVerified } from "@/lib/users";
import { RARITY_LABELS, type RarityTier } from "@/lib/rarity";
import { listTrades, type TradeView } from "@/lib/trades";
import { respondTradeAction } from "./actions";

export const metadata: Metadata = { title: "Échanges" };

type Props = {
  searchParams: Promise<{ message?: string; onglet?: string }>;
};

const STATUS_LABELS: Record<TradeView["status"], string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  cancelled: "Annulé",
};

type Side = { slug: string | null; title: string | null; cover: string | null; tier: RarityTier | null; coins: number };

const offerOf = (trade: TradeView): Side => ({ slug: trade.offer_slug, title: trade.offer_title, cover: trade.offer_cover, tier: trade.offer_tier, coins: trade.offer_coins });
const requestOf = (trade: TradeView): Side => ({ slug: trade.request_slug, title: trade.request_title, cover: trade.request_cover, tier: trade.request_tier, coins: trade.request_coins });

// Un côté de l'échange : l'album (avec sa rareté) et/ou des pièces
function TradeSide({ label, side }: { label: string; side: Side }) {
  return (
    <div className="side">
      <small>{label}</small>
      {side.title && side.tier ? (
        <>
          <Thumb cover={side.cover} tier={side.tier} title={side.title} />
          <span className="t">{side.title}</span>
          <span className={`tier-tag tier-${side.tier}`}>{RARITY_LABELS[side.tier]}</span>
          {side.coins > 0 && <span className="tier-tag" style={{ color: "var(--gold)" }}>+ {side.coins.toLocaleString("fr-FR")} pièces</span>}
        </>
      ) : (
        <>
          <span className="coins-big">{side.coins.toLocaleString("fr-FR")}</span>
          <span className="t">{side.coins.toLocaleString("fr-FR")} pièces</span>
        </>
      )}
    </div>
  );
}

export default async function EchangesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const { message, onglet } = await searchParams;
  if (!(await isEmailVerified(userId))) return <VerifyGate title="Échanges" message={message} />;
  const tab = onglet === "envoyes" ? "out" : onglet === "historique" ? "history" : "in";
  const { incoming, outgoing, history } = await listTrades(userId);

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <div className="row-between">
          <h1>Échanges</h1>
          <Link href="/amis" className="btn gold">Nouvel échange</Link>
        </div>
        <p className="sub">Entre amis : un album contre un album, ou contre des pièces.</p>

        <nav className="seg" aria-label="Onglets des échanges">
          <Link href="/echanges" aria-current={tab === "in" ? "page" : undefined}>Reçus{incoming.length > 0 && <b>{incoming.length}</b>}</Link>
          <Link href="/echanges?onglet=envoyes" aria-current={tab === "out" ? "page" : undefined}>Envoyés</Link>
          <Link href="/echanges?onglet=historique" aria-current={tab === "history" ? "page" : undefined}>Historique</Link>
        </nav>

        {tab === "in" && (
          <div className="stack two">
            {incoming.length === 0 && <p className="empty">Aucune proposition reçue.</p>}
            {incoming.map((trade) => (
              <div key={trade.id} className="trade">
                <div className="trade-head"><Avatar name={trade.proposer_pseudo} /><span><strong>{trade.proposer_pseudo}</strong> te propose</span></div>
                <div className="swap">
                  <TradeSide label="Tu reçois" side={offerOf(trade)} />
                  <span className="swap-ico"><SwapIcon /></span>
                  <TradeSide label="Tu donnes" side={requestOf(trade)} />
                </div>
                <div className="trade-actions">
                  <form action={respondTradeAction}>
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button name="decision" value="decline" className="btn red">Refuser</button>
                  </form>
                  <form action={respondTradeAction}>
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button name="decision" value="accept" className="btn green">Accepter</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "out" && (
          <div className="stack two">
            {outgoing.length === 0 && <p className="empty">Aucune proposition en attente.</p>}
            {outgoing.map((trade) => (
              <div key={trade.id} className="trade">
                <div className="trade-head"><Avatar name={trade.receiver_pseudo} /><span>Proposé à <strong>{trade.receiver_pseudo}</strong> · en attente</span></div>
                <div className="swap">
                  <TradeSide label="Tu donnes" side={offerOf(trade)} />
                  <span className="swap-ico"><SwapIcon /></span>
                  <TradeSide label="Tu reçois" side={requestOf(trade)} />
                </div>
                <div className="trade-actions">
                  <form action={respondTradeAction}>
                    <input type="hidden" name="tradeId" value={trade.id} />
                    <button name="decision" value="cancel" className="btn red">Annuler</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="stack">
            {history.length === 0 && <p className="empty">Aucun échange terminé.</p>}
            {history.map((trade) => {
              const iProposed = trade.proposer_id === userId;
              const other = iProposed ? trade.receiver_pseudo : trade.proposer_pseudo;
              const given = iProposed ? offerOf(trade) : requestOf(trade);
              const received = iProposed ? requestOf(trade) : offerOf(trade);
              const describe = (side: Side) => [side.title, side.coins > 0 ? `${side.coins.toLocaleString("fr-FR")} pièces` : null].filter(Boolean).join(" + ");
              return (
                <div key={trade.id} className="item">
                  <Avatar name={other} />
                  <div className="l">
                    <strong>{STATUS_LABELS[trade.status]} · avec {other}</strong>
                    <small>Tu donnes {describe(given)} · tu reçois {describe(received)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
