"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlbumCard } from "@/components/album-card";
import { MAX_STOCK } from "@/lib/pack-rules";
import { openPackAction, type PackActionState } from "./actions";

type Props = {
  initialStock: number;
  initialNextPackAt: string | null;
};

const initialState: PackActionState = {};

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function PackOpener({ initialStock, initialNextPackAt }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(openPackAction, initialState);
  const [now, setNow] = useState(() => Date.now());

  // Données à jour après une ouverture, sinon celles de la page
  const stock = state.stock ?? initialStock;
  const nextPackAt = state.nextPackAt !== undefined ? state.nextPackAt : initialNextPackAt;
  const remainingMs = nextPackAt ? new Date(nextPackAt).getTime() - now : 0;
  const expired = nextPackAt !== null && remainingMs <= 0;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quand le compteur arrive à zéro, on demande au serveur de recharger le stock
  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-lg">
          Packs disponibles : <span className="font-semibold">{stock}</span> / {MAX_STOCK}
        </p>
        {stock < MAX_STOCK && nextPackAt && (
          <p className="text-sm text-zinc-500">Prochain pack dans {formatRemaining(remainingMs)}</p>
        )}
      </div>

      <form action={formAction}>
        <button
          type="submit"
          disabled={pending || stock < 1}
          className="rounded-lg bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Ouverture..." : "Ouvrir un pack"}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.cards && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {state.cards.map((card, index) => (
            <li key={`${card.slug}-${index}`}>
              <AlbumCard card={card} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
