"use client";

import { useEffect, useRef, useState } from "react";

type ChartResponse = {
  points: Array<{ time: string; value: number; volume: number }>;
  variation: number | null;
};

// Graphique de prix (Lightweight Charts) alimenté par une route de l'API
export function PriceChart({ endpoint, label }: { endpoint: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ChartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) throw new Error("Données indisponibles.");
        return (await res.json()) as ChartResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data || data.points.length === 0) return;

    // La bibliothèque (la plus lourde du site) n'est téléchargée qu'au moment d'afficher un graphique
    let disposed = false;
    let cleanup = () => {};
    import("lightweight-charts").then(({ ColorType, createChart, LineSeries }) => {
      if (disposed) return;
      // Couleurs du thème du jeu (voir app/globals.css) : la bibliothèque ne lit pas les variables CSS
      const chart = createChart(container, {
        height: 220,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9a94c2", fontFamily: "Chakra Petch, system-ui, sans-serif" },
        grid: { vertLines: { visible: false }, horzLines: { color: "#2a2550" } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false },
        crosshair: { horzLine: { color: "#3a3466" }, vertLine: { color: "#3a3466" } },
        // Langue fixée : sinon la bibliothèque lit celle du navigateur, qu'elle ne sait pas toujours interpréter
        localization: { locale: "fr-FR", priceFormatter: (price: number) => Math.round(price).toLocaleString("fr-FR") },
      });
      // Pas de titre sur la courbe : le nom est déjà affiché au-dessus du graphique
      const series = chart.addSeries(LineSeries, { color: "#f4b740", lineWidth: 3 });
      series.setData(data.points.map((point) => ({ time: point.time, value: point.value })));
      chart.timeScale().fitContent();

      const resize = () => chart.applyOptions({ width: container.clientWidth });
      resize();
      window.addEventListener("resize", resize);
      cleanup = () => {
        window.removeEventListener("resize", resize);
        chart.remove();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [data]);

  if (error) return <p className="empty">{error}</p>;
  if (!data) return <p className="empty">Chargement du graphique...</p>;
  if (data.points.length === 0) return <p className="empty">Aucune vente sur cette période.</p>;

  const variation = data.variation;
  return (
    <div>
      <p className="sub" style={{ margin: "8px 0 4px" }}>
        Variation sur la période :{" "}
        <strong className={variation !== null && variation < 0 ? "down" : "up"}>
          {variation === null ? "—" : `${variation > 0 ? "+" : ""}${variation.toLocaleString("fr-FR")} %`}
        </strong>
      </p>
      <div ref={containerRef} style={{ width: "100%", height: 220 }} role="img" aria-label={`Graphique des prix : ${label}`} />
    </div>
  );
}
