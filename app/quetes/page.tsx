import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { auth } from "@/auth";
import { DiscIcon, SparkIcon, StarIcon, SwapIcon, CrownIcon } from "@/components/icons";
import { DrawBanner } from "@/components/draw-banner";
import { SiteNav } from "@/components/site-nav";
import { isDrawPending } from "@/lib/daily-draw";
import { getQuestStatus, PERIOD_LABELS, type Period, type QuestEvent } from "@/lib/quests";
import { claimQuestAction } from "./actions";

export const metadata: Metadata = { title: "Quêtes" };

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

// Icône et couleur de chaque type de quête
const EVENT_STYLE: Record<QuestEvent, { icon: ReactNode; color: string }> = {
  pack_opened: { icon: <DiscIcon />, color: "var(--gold)" },
  new_album: { icon: <SparkIcon />, color: "var(--r-rare)" },
  rare_card: { icon: <StarIcon />, color: "var(--r-epique)" },
  legendary_card: { icon: <CrownIcon />, color: "var(--r-legendaire)" },
  trade: { icon: <SwapIcon />, color: "var(--r-peu_commun)" },
};

// Temps restant avant les nouvelles quêtes de la période (en UTC, comme lib/quests.ts)
function renewsIn(period: Period, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  let next: number;
  if (period === "daily") next = Date.UTC(y, m, d + 1);
  else if (period === "monthly") next = Date.UTC(y, m + 1, 1);
  else next = Date.UTC(y, m, d + (8 - (now.getUTCDay() || 7)));
  const hours = Math.max(0, Math.floor((next - now.getTime()) / 3_600_000));
  if (hours >= 48) return `nouvelles dans ${Math.floor(hours / 24)} j`;
  if (hours >= 1) return `nouvelles dans ${hours} h`;
  return "nouvelles dans moins d'une heure";
}

export default async function QuetesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { message } = await searchParams;
  const [quests, drawPending] = await Promise.all([getQuestStatus(session.user.id), isDrawPending(session.user.id)]);
  const ready = quests.filter((quest) => !quest.claimed && quest.progress >= quest.target).length;

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Quêtes</h1>
        <p className="sub">{ready === 0 ? "Aucune récompense à réclamer" : `${ready} récompense${ready > 1 ? "s" : ""} à réclamer`}</p>
        <DrawBanner pending={drawPending} />

        {PERIODS.map((period) => (
          <section key={period}>
            <h2 className="label">{PERIOD_LABELS[period]} <span>{renewsIn(period)}</span></h2>
            <div className="stack two">
              {quests
                .filter((quest) => quest.period === period)
                .map((quest) => {
                  const progress = Math.min(quest.progress, quest.target);
                  const done = progress >= quest.target;
                  const style = EVENT_STYLE[quest.event];
                  return (
                    <div key={quest.key} className={`quest${done ? " done" : ""}${quest.claimed ? " claimed" : ""}`}>
                      <span className="q-ico" style={{ "--c": style.color } as CSSProperties}>{style.icon}</span>
                      <div className="l">
                        <strong>{quest.title}</strong>
                        <div className="bar">
                          <div style={{ width: `${(progress / quest.target) * 100}%`, "--c": done ? "var(--gold)" : "var(--r-peu_commun)" } as CSSProperties} />
                        </div>
                        <div className="q-meta">
                          <span>{progress} / {quest.target}</span>
                          <span className="reward"><i className="coin-i" aria-hidden="true" />{quest.reward.toLocaleString("fr-FR")}</span>
                        </div>
                      </div>
                      {quest.claimed ? (
                        <span className="btn" aria-disabled="true">Récupéré</span>
                      ) : (
                        <form action={claimQuestAction}>
                          <input type="hidden" name="questKey" value={quest.key} />
                          <button type="submit" className="btn gold" disabled={!done}>Réclamer</button>
                        </form>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
