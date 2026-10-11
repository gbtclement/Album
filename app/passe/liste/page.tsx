import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { formatNumber } from "@/components/game-ui";
import { CheckIcon, CrownIcon, DiscIcon, LockIcon } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { claimKey, getPassState } from "@/lib/pass";
import { PASS_REWARDS, PASS_TIERS, PASS_XP, passRewardLabel, XP_PER_TIER, type PassReward, type PassTrack } from "@/lib/pass-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { claimAllPassAction, claimPassTierAction } from "../actions";
import { ScrollToCurrent } from "../scroll-to-current";

// Ancienne vue du Sillon (colonnes défilantes), gardée en secours : la page principale /passe est le vinyle
export const metadata: Metadata = { title: "Le Sillon (liste)" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

// Type de pack d'une récompense (pour sa couleur), son nom court et le nombre
function rewardKind(reward: PassReward) {
  if (reward.legendary) return { kind: "legendary", name: "Légendaire", count: reward.legendary };
  if (reward.epic) return { kind: "epic", name: "Épique", count: reward.epic };
  if (reward.classic) return { kind: "classic", name: "Pack", count: reward.classic };
  return { kind: "solo", name: "Solo", count: reward.solo ?? 0 };
}

function timeLeft(endsAt: Date) {
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
  const current = Math.min(PASS_TIERS, pass.level + 1);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(pass.endsAt.getTime() - 86_400_000);

  function cell(tier: number, track: PassTrack, reward: PassReward) {
    const reached = tier <= pass.level;
    const claimed = pass.claimed.has(claimKey(tier, track));
    const locked = track === "premium" && !pass.premium;
    const state = claimed ? "claimed" : locked ? "locked" : reached ? "ready" : "todo";
    const { kind, name, count } = rewardKind(reward);
    const label = passRewardLabel(reward);
    return (
      <div className={`pass-cell ${track} ${state} kind-${kind}`}>
        <span className="pass-pack" aria-hidden="true">
          <i className="pass-pack-disc" />
          {count > 1 && <b>×{count}</b>}
        </span>
        <span className="pass-pack-name">{name}</span>
        {state === "ready" && (
          <form action={claimPassTierAction}>
            <input type="hidden" name="tier" value={tier} />
            <input type="hidden" name="track" value={track} />
            <button type="submit" className="pass-take" aria-label={`Prendre ${label} (palier ${tier})`}>Prendre</button>
          </form>
        )}
        {state === "claimed" && <span className="pass-badge ok" title="Récupéré"><CheckIcon /><span className="sr-only">Récupéré</span></span>}
        {state === "locked" && <span className="pass-badge lock" title="Premium"><LockIcon /><span className="sr-only">Réservé au premium</span></span>}
      </div>
    );
  }

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <section className="pass-hero">
          {/* Vinyle du niveau : l'anneau autour se remplit vers le palier suivant */}
          <div className="pass-disc" style={{ "--p": `${(inTier / XP_PER_TIER) * 100}%` } as CSSProperties}>
            <span className="pass-disc-vinyl">
              <span className="pass-disc-label"><small>Niv.</small>{pass.level}</span>
            </span>
          </div>
          <div className="pass-hero-text">
            <p className="pass-season">Saison {/^[aeiou]/.test(month) ? "d'" : "de "}{month}</p>
            <h1>Le Sillon</h1>
            <p className="pass-hero-xp">
              {maxed ? <>Passe terminé · <b>{formatNumber(pass.xp)} XP</b></> : <><b>{formatNumber(inTier)}</b> / {formatNumber(XP_PER_TIER)} XP vers le palier {current}</>}
            </p>
            <p className="pass-hero-end">Fin dans {timeLeft(pass.endsAt)}</p>
          </div>
          {pass.claimable > 0 && (
            <form action={claimAllPassAction} className="pass-hero-claim">
              <button type="submit" className="btn gold lg">Tout réclamer ({pass.claimable})</button>
            </form>
          )}
        </section>

        <div className="pass-board">
          <div className="pass-rows" aria-hidden="true">
            <span className="pass-row-head" />
            <span className="pass-row free"><DiscIcon />Gratuit</span>
            <span className="pass-row premium"><CrownIcon />Premium</span>
          </div>
          <div className="pass-track" id="pass-track" tabIndex={0} aria-label="Paliers du passe, à faire défiler">
            {PASS_REWARDS.map((row) => {
              const fill = row.tier <= pass.level ? 100 : row.tier === current && !maxed ? (inTier / XP_PER_TIER) * 100 : 0;
              return (
                <div
                  key={row.tier}
                  className={`pass-col${row.tier <= pass.level ? " reached" : ""}${row.tier % 5 === 0 ? " milestone" : ""}`}
                  data-current={row.tier === current ? "" : undefined}
                  style={{ "--f": `${fill}%` } as CSSProperties}
                >
                  <span className="pass-tier">
                    <span className="pass-num">{row.tier}</span>
                    {row.tier === current && !maxed && <span className="pass-you">{formatNumber(pass.xp)} XP</span>}
                  </span>
                  {cell(row.tier, "free", row.free)}
                  {cell(row.tier, "premium", row.premium)}
                </div>
              );
            })}
          </div>
        </div>
        <ScrollToCurrent trackId="pass-track" />

        {!pass.premium && (
          <div className="pass-upsell">
            <CrownIcon />
            <p>
              <strong>Ligne premium</strong> : des packs en plus à chaque palier, 2 packs Épiques et un pack Légendaire au palier 30,
              et un stock de 15 packs. Devenu premium en cours de mois, tu récupères les paliers déjà atteints. <Link href="/premium">Découvrir le premium</Link>
            </p>
          </div>
        )}

        <h2 className="label">XP par carte</h2>
        <div className="pass-xp-table">
          {[...RARITY_TIERS].reverse().map((tier) => (
            <div key={tier} className={`pass-xp-chip tier-${tier}`}>
              <i />
              <span>{RARITY_LABELS[tier]}</span>
              <b>{PASS_XP[tier]}</b>
            </div>
          ))}
        </div>
        <p className="sub" style={{ marginTop: 10 }}>
          Toutes les cartes comptent : packs du stock, packs gagnés, Solo, Épique, Légendaire et pioche du jour trouvée. Les paliers
          atteints et pas réclamés sont ajoutés à tes packs à la fin du mois. <Link href="/packs">Ouvrir des packs</Link>
        </p>
      </main>
    </>
  );
}
