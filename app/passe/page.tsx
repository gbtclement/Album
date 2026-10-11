import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { formatNumber } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { claimKey, getPassState } from "@/lib/pass";
import { PASS_REWARDS, PASS_TIERS, PASS_XP, passRewardLabel, XP_PER_TIER, type PassReward, type PassTrack } from "@/lib/pass-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { claimAllPassAction, claimPassTierAction } from "./actions";
import { ScrollToCurrent } from "./scroll-to-current";

export const metadata: Metadata = { title: "Passe de combat" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

// Petit vinyle de la récompense (couleur selon le type de pack) et nombre
function RewardIcon({ reward }: { reward: PassReward }) {
  const [kind, count] = reward.legendary
    ? ["legendary", reward.legendary]
    : reward.epic
      ? ["epic", reward.epic]
      : reward.classic
        ? ["", reward.classic]
        : ["solo", reward.solo ?? 0];
  return (
    <span className="pass-reward">
      <i className={`vinyl-i ${kind}`} aria-hidden="true" />
      {count > 1 && <b>×{count}</b>}
    </span>
  );
}

function daysLeft(endsAt: Date) {
  const hours = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 3_600_000));
  if (hours >= 48) return `${Math.floor(hours / 24)} jours`;
  if (hours >= 1) return `${hours} h`;
  return "moins d'une heure";
}

export default async function PassePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { message } = await searchParams;
  const pass = await getPassState(session.user.id);
  const maxed = pass.level >= PASS_TIERS;
  const inTier = maxed ? XP_PER_TIER : pass.xp % XP_PER_TIER;

  function cell(tier: number, track: PassTrack, reward: PassReward) {
    const reached = tier <= pass.level;
    const claimed = pass.claimed.has(claimKey(tier, track));
    const locked = track === "premium" && !pass.premium;
    const label = passRewardLabel(reward);
    const state = claimed ? "claimed" : locked ? "locked" : reached ? "ready" : "todo";
    return (
      <div className={`pass-cell ${track} ${state}`} title={label}>
        <RewardIcon reward={reward} />
        {state === "ready" ? (
          <form action={claimPassTierAction}>
            <input type="hidden" name="tier" value={tier} />
            <input type="hidden" name="track" value={track} />
            <button type="submit" className="btn gold" aria-label={`Réclamer ${label} (palier ${tier})`}>Prendre</button>
          </form>
        ) : (
          <span className="pass-state">{claimed ? "✓" : locked ? "🔒" : label.replace(/^1 /, "")}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Passe de combat</h1>
        <p className="sub">Chaque carte obtenue rapporte de l&apos;XP. Fin de la saison dans {daysLeft(pass.endsAt)}.</p>

        <div className="pass-head">
          <span className="pass-level"><small>Niv.</small>{pass.level}</span>
          <div className="pass-xp">
            <div className="bar">
              <div style={{ width: `${(inTier / XP_PER_TIER) * 100}%`, "--c": "var(--r-epique)" } as CSSProperties} />
            </div>
            <span>
              {maxed ? `Passe terminé · ${formatNumber(pass.xp)} XP` : `${formatNumber(inTier)} / ${formatNumber(XP_PER_TIER)} XP vers le palier ${pass.level + 1}`}
            </span>
          </div>
          {pass.claimable > 0 && (
            <form action={claimAllPassAction}>
              <button type="submit" className="btn gold">Tout réclamer ({pass.claimable})</button>
            </form>
          )}
        </div>

        <div className="pass-track" id="pass-track">
          <div className="pass-col pass-legend">
            <span className="pass-tier" />
            <span className="pass-row-label">Gratuit</span>
            <span className="pass-row-label premium">Premium</span>
          </div>
          {PASS_REWARDS.map((row) => (
            <div
              key={row.tier}
              className={`pass-col${row.tier <= pass.level ? " reached" : ""}`}
              data-current={row.tier === Math.min(PASS_TIERS, pass.level + 1) ? "" : undefined}
            >
              <span className="pass-tier">{row.tier}</span>
              {cell(row.tier, "free", row.free)}
              {cell(row.tier, "premium", row.premium)}
            </div>
          ))}
        </div>
        <ScrollToCurrent trackId="pass-track" />

        {!pass.premium && (
          <p className="pass-premium-note">
            🔒 La ligne premium (packs en plus à chaque palier, packs Épiques et un pack Légendaire au palier 30) est réservée aux comptes
            premium, qui ont aussi un stock de 15 packs. Devenu premium en cours de mois, tu récupères les paliers déjà atteints.
          </p>
        )}

        <h2 className="label">XP par carte</h2>
        <div className="rates">
          {[...RARITY_TIERS].reverse().map((tier) => (
            <div key={tier} className={`rate tier-${tier}`}>
              <span><i />{RARITY_LABELS[tier]}</span>
              <b>{PASS_XP[tier]} XP</b>
            </div>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          Packs du stock, packs gagnés, Solo, Épique, Légendaire et pioche du jour trouvée : toutes les cartes comptent.
          Les paliers atteints et pas réclamés sont ajoutés à tes packs à la fin du mois. <Link href="/packs">Ouvrir des packs</Link>
        </p>
      </main>
    </>
  );
}
