import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { getQuestStatus, PERIOD_LABELS, type Period } from "@/lib/quests";
import { claimQuestAction } from "./actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

const PERIODS: Period[] = ["daily", "weekly", "monthly"];

export default async function QuetesPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/connexion");

  const { message } = await searchParams;
  const quests = await getQuestStatus(session.user.id);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Quêtes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Les quêtes se renouvellent chaque jour, chaque semaine (à partir du lundi) et chaque mois, en UTC.
          </p>
        </div>

        {message && <p role="status" className="rounded-lg bg-zinc-100 px-4 py-3 text-sm">{message}</p>}

        {PERIODS.map((period) => (
          <section key={period}>
            <h2 className="mb-3 font-semibold">{PERIOD_LABELS[period]}</h2>
            <ul className="space-y-3">
              {quests.filter((quest) => quest.period === period).map((quest) => {
                const done = quest.progress >= quest.target;
                const percent = Math.min(100, Math.round((quest.progress / quest.target) * 100));
                return (
                  <li key={quest.key} className="rounded-lg border border-zinc-200 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{quest.title}</p>
                        <p className="text-sm text-zinc-500">
                          {quest.progress} / {quest.target} · récompense : {quest.reward} pièces
                        </p>
                      </div>
                      {quest.claimed ? (
                        <span className="text-sm text-zinc-500">Récompense récupérée</span>
                      ) : done ? (
                        <form action={claimQuestAction}>
                          <input type="hidden" name="questKey" value={quest.key} />
                          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Récupérer</button>
                        </form>
                      ) : (
                        <span className="text-sm text-zinc-500">En cours</span>
                      )}
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
