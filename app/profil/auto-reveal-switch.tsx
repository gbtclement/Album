"use client";

import { useState, useTransition } from "react";
import { setAutoRevealAction } from "@/app/packs/actions";

// Interrupteur du réglage « Révéler automatiquement », enregistré sur le compte
export function AutoRevealSwitch({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="toggle"
      role="switch"
      aria-checked={enabled}
      aria-label="Révéler automatiquement les cartes des packs"
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        startTransition(() => setAutoRevealAction(next));
      }}
    />
  );
}
