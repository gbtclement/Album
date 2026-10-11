import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatNumber } from "@/components/game-ui";
import { CrownIcon } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { claimKey, getPassState } from "@/lib/pass";
import { PASS_REWARDS, PASS_TIERS, PASS_XP, passRewardLabel, XP_PER_TIER, type PassReward, type PassTrack } from "@/lib/pass-rules";
import { RARITY_LABELS, RARITY_TIERS } from "@/lib/rarity";
import { claimAllPassAction } from "./actions";
import { PassVinyl, type PassCell } from "./pass-vinyl";

export const metadata: Metadata = { title: "Disque d'Or" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

function rewardKind(reward: PassReward): PassCell["kind"] {
  if (reward.legendary) return "legendary";
  if (reward.epic) return "epic";
  if (reward.classic) return "classic";
  return "solo";
}

function timeLeft(endsAt: Date) {
  const hours = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 3_600_000));
  if (hours >= 48) return `${Math.floor(hours / 24)} jours`;
  if (hours >= 1) return `${hours} h`;
  return "moins d'une heure";
}

// Disque d'Or (ancien « passe de combat ») : les paliers posés sur le sillon d'un vinyle.
// L'ancienne vue en colonnes reste disponible sur /passe/liste.
export default async function PassePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { message } = await searchParams;
  const pass = await getPassState(session.user.id);
  const maxed = pass.level >= PASS_TIERS;
  const inTier = maxed ? XP_PER_TIER : pass.xp % XP_PER_TIER;
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(pass.endsAt.getTime() - 86_400_000);

  const cell = (tier: number, track: PassTrack, reward: PassReward): PassCell => {
    const claimed = pass.claimed.has(claimKey(tier, track));
    const locked = track === "premium" && !pass.premium;
    return {
      label: passRewardLabel(reward),
      kind: rewardKind(reward),
      state: claimed ? "claimed" : locked ? "locked" : tier <= pass.level ? "ready" : "todo",
    };
  };
  const tiers = PASS_REWARDS.map((row) => ({ tier: row.tier, free: cell(row.tier, "free", row.free), premium: cell(row.tier, "premium", row.premium) }));

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <header className="sillon-head">
          <div>
            <p className="pass-season">Saison {/^[aeiou]/.test(month) ? "d'" : "de "}{month} · fin dans {timeLeft(pass.endsAt)}</p>
            <h1>Disque d&apos;Or</h1>
            <p className="pass-hero-xp">
              {maxed ? <>Disque d&apos;Or décroché · <b>{formatNumber(pass.xp)} XP</b></> : <><b>{formatNumber(inTier)}</b> / {formatNumber(XP_PER_TIER)} XP vers le palier {pass.level + 1}</>}
            </p>
          </div>
          {pass.claimable > 0 && (
            <form action={claimAllPassAction}>
              <button type="submit" className="btn gold lg">Tout prendre ({pass.claimable})</button>
            </form>
          )}
        </header>

        <PassVinyl
          tiers={tiers}
          position={maxed ? PASS_TIERS : pass.level + inTier / XP_PER_TIER}
          level={pass.level}
          xpToNext={maxed ? null : XP_PER_TIER - inTier}
          premium={pass.premium}
        />

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
          Chaque carte fait avancer le diamant sur le sillon : packs du stock, packs gagnés, Solo, Épique, Légendaire et pioche du jour
          trouvée. Les paliers atteints et pas pris sont ajoutés à tes packs à la fin du mois. <Link href="/packs">Ouvrir des packs</Link>
          {" · "}<Link href="/passe/liste">Vue en liste</Link>
        </p>
      </main>
    </>
  );
}
