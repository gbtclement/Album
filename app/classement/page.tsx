import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SiteNav } from "@/components/site-nav";
import { getPlayerRank, getTopPlayers } from "@/lib/leaderboard";

export default async function ClassementPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/connexion");
  const userId = session.user.id;

  const [top, me] = await Promise.all([getTopPlayers(100), getPlayerRank(userId)]);
  const inTop = top.some((row) => row.user_id === userId);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Classement</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Score = somme des points de rareté des albums possédés (Commun 1, Peu commun 2, Rare 5, Épique 10, Légendaire 25).
          Un album compte une seule fois, les doublons ne rapportent rien de plus.
        </p>

        {top.length === 0 ? (
          <p className="mt-8 text-zinc-600">Personne n&apos;a encore d&apos;album. Ouvre un pack pour apparaître ici.</p>
        ) : (
          <table className="mt-8 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="py-2 pr-4">Rang</th>
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 pr-4 text-right">Score</th>
                <th className="py-2 pr-4 text-right">Albums</th>
                <th className="py-2 pr-4 text-right">Épiques et légendaires</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row) => (
                <LeaderLine key={row.user_id} row={row} isMe={row.user_id === userId} />
              ))}
            </tbody>
          </table>
        )}

        {me && !inTop && (
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="mb-2 text-sm text-zinc-500">Ta position</p>
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                <LeaderLine row={me} isMe />
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function LeaderLine({
  row,
  isMe,
}: {
  row: { rank: number; pseudo: string; score: number; albums: number; rares: number };
  isMe: boolean;
}) {
  return (
    <tr className={`border-b border-zinc-100 ${isMe ? "bg-amber-50 font-medium" : ""}`}>
      <td className="py-2 pr-4">{row.rank}</td>
      <td className="py-2 pr-4">{row.pseudo}</td>
      <td className="py-2 pr-4 text-right">{row.score}</td>
      <td className="py-2 pr-4 text-right">{row.albums}</td>
      <td className="py-2 pr-4 text-right">{row.rares}</td>
    </tr>
  );
}
