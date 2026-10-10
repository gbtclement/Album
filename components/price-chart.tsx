"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, LineSeries } from "lightweight-charts";

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

    const chart = createChart(container, {
      height: 260,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#52525b" },
      grid: { vertLines: { color: "#f4f4f5" }, horzLines: { color: "#f4f4f5" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(LineSeries, { color: "#b45309", lineWidth: 2, title: label });
    series.setData(data.points.map((point) => ({ time: point.time, value: point.value })));
    chart.timeScale().fitContent();

    const resize = () => chart.applyOptions({ width: container.clientWidth });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [data, label]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-zinc-500">Chargement du graphique...</p>;
  if (data.points.length === 0) return <p className="text-sm text-zinc-500">Aucune vente sur cette période.</p>;

  const variation = data.variation;
  return (
    <div>
      <p className="mb-2 text-sm">
        Variation sur la période :{" "}
        <strong className={variation !== null && variation < 0 ? "text-red-600" : "text-emerald-700"}>
          {variation === null ? "—" : `${variation > 0 ? "+" : ""}${variation} %`}
        </strong>
      </p>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
