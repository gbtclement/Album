"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { matchesSearch, SearchBar } from "@/components/game-controls";
import { Price, Thumb } from "@/components/game-ui";
import { PriceChart } from "@/components/price-chart";
import type { StockLine } from "@/lib/market-stats";
import { RARITY_LABELS } from "@/lib/rarity";

function formatChange(change: number | null) {
  if (change === null) return "—";
  return `${change >= 0 ? "+" : "−"}${Math.abs(change).toLocaleString("fr-FR")} %`;
}

// Mini-courbe d'une cote : verte si elle monte, corail si elle baisse
function Sparkline({ points, change }: { points: number[]; change: number | null }) {
  if (points.length < 2) return <svg className="spark" viewBox="0 0 70 26" aria-hidden="true" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const coords = points
    .map((value, i) => `${((i * 66) / (points.length - 1) + 2).toFixed(1)},${(2 + ((max - value) / (max - min || 1)) * 22).toFixed(1)}`)
    .join(" ");
  const color = (change ?? 0) >= 0 ? "var(--r-peu_commun)" : "var(--coral)";
  return (
    <svg className="spark" viewBox="0 0 70 26" aria-hidden="true">
      <polyline points={coords} style={{ fill: "none", stroke: color, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />
    </svg>
  );
}

const SORTS = [
  { value: "echanges", label: "Plus échangées" },
  { value: "prix-croissant", label: "Prix croissant" },
  { value: "prix-decroissant", label: "Prix décroissant" },
  { value: "hausse", label: "Hausse" },
  { value: "baisse", label: "Baisse" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

function sortStocks(stocks: StockLine[], sort: Sort) {
  // "echanges" : ordre reçu du serveur (albums les plus vendus d'abord)
  if (sort === "echanges") return stocks;
  const change = (stock: StockLine) => stock.change ?? 0;
  const compare: Record<Exclude<Sort, "echanges">, (a: StockLine, b: StockLine) => number> = {
    "prix-croissant": (a, b) => a.last - b.last,
    "prix-decroissant": (a, b) => b.last - a.last,
    hausse: (a, b) => change(b) - change(a),
    baisse: (a, b) => change(a) - change(b),
  };
  return [...stocks].sort(compare[sort]);
}

// Lignes affichées d'abord, puis par tranches quand on arrive en bas : la page reste légère
// même avec des centaines de cotes (chaque ligne a une pochette et une mini-courbe).
const STEP = 30;

// Grand graphique en haut (indice du marché ou album choisi), puis toutes les cotes avec recherche et tri
export function StockBrowser({ stocks }: { stocks: StockLine[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("echanges");
  const [selected, setSelected] = useState<string | null>(null);
  const current = stocks.find((stock) => stock.slug === selected) ?? null;
  const visible = useMemo(
    () => sortStocks(stocks.filter((stock) => matchesSearch(query, stock.title, stock.artist)), sort),
    [stocks, query, sort],
  );

  // Nombre de lignes affichées, remis à zéro quand la recherche ou le tri change
  const listKey = `${query}|${sort}`;
  const [shown, setShown] = useState({ key: listKey, count: STEP });
  const count = shown.key === listKey ? shown.count : STEP;
  const showMore = () => setShown({ key: listKey, count: count + STEP });
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = count < visible.length;
  useEffect(() => {
    const target = sentinel.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setShown({ key: listKey, count: count + STEP });
    }, { rootMargin: "400px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, listKey, count]);

  return (
    <>
      <div className="chart-card">
        <div className="chart-top">
          {current && <Thumb cover={current.cover} tier={current.tier} title={current.title} />}
          <div className="l">
            <strong>{current ? current.title : "Indice du marché"}</strong>
            <small className="muted">
              {current ? (
                <>
                  {current.artist} · <span className={`tier-tag tier-${current.tier}`}>{RARITY_LABELS[current.tier]}</span> ·{" "}
                  <Link href={`/album/${current.slug}`} className="btn-link">fiche</Link>
                </>
              ) : (
                "Prix moyen de toutes les ventes"
              )}
            </small>
          </div>
          {current && (
            <div style={{ textAlign: "right" }}>
              <div className="big"><i className="coin-i" aria-hidden="true" />{current.last.toLocaleString("fr-FR")}</div>
              <small className={(current.change ?? 0) >= 0 ? "up" : "down"} style={{ fontFamily: "var(--f-ui)", fontWeight: 700 }}>{formatChange(current.change)}</small>
            </div>
          )}
        </div>
        <PriceChart
          key={current?.slug ?? "indice"}
          endpoint={current ? `/api/market/history?album=${current.slug}&jours=30` : "/api/market/history?jours=30"}
          label={current ? current.title : "Indice du marché"}
        />
        {current && (
          <button type="button" className="btn-link" onClick={() => setSelected(null)}>Revenir à l&apos;indice du marché</button>
        )}
      </div>

      <h2 className="label">Toutes les cotes</h2>
      <SearchBar id="q-bourse" value={query} onChange={setQuery} placeholder="Rechercher une cote" />
      <div className="sortbar" role="group" aria-label="Trier">
        <span>Trier</span>
        {SORTS.map((option) => (
          <button key={option.value} type="button" aria-pressed={sort === option.value} onClick={() => setSort(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="stack two">
        {stocks.length === 0 ? (
          <p className="empty">Aucune vente sur les 30 derniers jours : les cotes apparaîtront avec les premiers achats au marché.</p>
        ) : visible.length === 0 ? (
          <p className="empty">Aucune cote ne correspond à « {query} ».</p>
        ) : (
          visible.slice(0, count).map((stock) => (
            <button
              key={stock.slug}
              type="button"
              className={`item${stock.slug === selected ? " sel" : ""}`}
              onClick={() => {
                setSelected(stock.slug);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Thumb cover={stock.cover} tier={stock.tier} title={stock.title} />
              <div className="l">
                <strong>{stock.title}</strong>
                <small>{stock.artist}</small>
              </div>
              <div className="r">
                <Sparkline points={stock.points} change={stock.change} />
                <div style={{ textAlign: "right" }}>
                  <Price value={stock.last} />
                  <small style={{ fontFamily: "var(--f-ui)", fontWeight: 700 }} className={(stock.change ?? 0) >= 0 ? "up" : "down"}>{formatChange(stock.change)}</small>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
      {hasMore && (
        <div ref={sentinel} className="more">
          <button type="button" className="btn" onClick={showMore}>
            Afficher plus ({visible.length - count} restantes)
          </button>
        </div>
      )}
    </>
  );
}
