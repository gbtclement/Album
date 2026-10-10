"use client";

import { useState } from "react";

// Pochette avec plan B : Cover Art Archive renvoie parfois une erreur (image retirée, serveur en panne).
// On essaie la petite version, puis la grande, puis on affiche un vinyle avec le titre de l'album.
export function CoverImage({
  src,
  fallback,
  title,
  alt = "",
  lazy = false,
}: {
  src: string | null;
  fallback?: string | null;
  title: string;
  alt?: string;
  lazy?: boolean;
}) {
  // Adresses déjà en échec : une nouvelle pochette (autre carte au même endroit) repart de zéro
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallback].find((url): url is string => Boolean(url) && !failed.includes(url!));

  if (!current) {
    return (
      <span className="no-cover" role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <span className="nc-disc" aria-hidden="true" />
        <span className="nc-t" aria-hidden="true">{title}</span>
      </span>
    );
  }

  const markFailed = () => setFailed((list) => (list.includes(current) ? list : [...list, current]));
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive ou Deezer
    <img
      src={current}
      alt={alt}
      loading={lazy ? "lazy" : undefined}
      onError={markFailed}
      // L'image a pu échouer avant que React prenne la main sur la page : onError ne se déclencherait jamais
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) markFailed();
      }}
    />
  );
}
