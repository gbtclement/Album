import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { PriceChart } from "@/components/price-chart";
import { getMovers, type Mover } from "@/lib/market-stats";

export default async function BoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { rises, falls } = await getMovers(30, 5);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-4xl space-y-10 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Bourse</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Prix moyen quotidien des ventes en pièces sur le marché. La cote d&apos;un album est la moyenne de ses dix dernières ventes.
          </p>
        </div>

        <section>
          <h2 className="mb-3 font-semibold">Indice du marché (30 jours)</h2>
          <PriceChart endpoint="/api/market/history?jours=30" label="Prix moyen des ventes" />
        </section>

        <MoversTable title="Plus fortes hausses (30 jours)" movers={rises} empty="Pas encore de hausse à afficher." />
        <MoversTable title="Plus fortes baisses (30 jours)" movers={falls} empty="Pas encore de baisse à afficher." />
      </main>
    </>
  );
}

function MoversTable({ title, movers, empty }: { title: string; movers: Mover[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {movers.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300">
              <th className="py-2 pr-4">Album</th>
              <th className="py-2 pr-4">Premier prix</th>
              <th className="py-2 pr-4">Dernier prix</th>
              <th className="py-2 pr-4">Variation</th>
            </tr>
          </thead>
          <tbody>
            {movers.map((mover) => (
              <tr key={mover.slug} className="border-b border-zinc-100">
                <td className="py-2 pr-4">
                  <a href={`/album/${mover.slug}`} className="font-medium hover:underline">{mover.title}</a>
                  <span className="text-zinc-500"> · {mover.artist}</span>
                </td>
                <td className="py-2 pr-4">{mover.firstPrice}</td>
                <td className="py-2 pr-4">{mover.lastPrice}</td>
                <td className={`py-2 pr-4 font-semibold ${mover.change < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {mover.change > 0 ? "+" : ""}{mover.change} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
