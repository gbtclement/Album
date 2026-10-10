import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteNav } from "@/components/site-nav";
import { getStockList } from "@/lib/market-stats";
import { StockBrowser } from "./stock-browser";

export const metadata: Metadata = { title: "Bourse" };

export default async function BoursePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const stocks = await getStockList(30, 1000);

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Bourse</h1>
        <p className="sub">Prix moyen des ventes au marché, sur 30 jours. La cote d&apos;un album est la moyenne de ses dix dernières ventes.</p>
        <StockBrowser stocks={stocks} />
      </main>
    </>
  );
}
