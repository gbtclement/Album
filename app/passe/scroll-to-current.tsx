"use client";

import { useEffect } from "react";

// Fait défiler la frise des paliers jusqu'au palier en cours à l'arrivée sur la page
export function ScrollToCurrent({ trackId }: { trackId: string }) {
  useEffect(() => {
    const track = document.getElementById(trackId);
    const current = track?.querySelector<HTMLElement>("[data-current]");
    if (!track || !current) return;
    track.scrollLeft = Math.max(0, current.offsetLeft - track.clientWidth / 2 + current.clientWidth / 2);
  }, [trackId]);
  return null;
}
