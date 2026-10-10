"use client";

import Image from "next/image";
import { useState } from "react";

// Cover Art Archive renvoie parfois des adresses en http:// : le même fichier est servi en https://
// (sinon, sur le site en HTTPS, le navigateur signale un contenu non sécurisé)
function secure(url: string | null | undefined) {
  return url ? url.replace(/^http:\/\//, "https://") : null;
}

// Pochette passée par l'optimiseur d'images (voir images dans next.config.ts), avec plan B :
// Cover Art Archive renvoie parfois une erreur (image retirée, serveur en panne). On essaie la petite version,
// puis la grande, puis on affiche un vinyle avec le titre de l'album.
// Le parent doit être positionné (.cover, .thumb, .art) : l'image le remplit.
export function CoverImage({
  src,
  fallback,
  title,
  alt = "",
  lazy = false,
  priority = false,
  sizes = "(min-width: 900px) 160px, 33vw",
}: {
  src: string | null;
  fallback?: string | null;
  title: string;
  alt?: string;
  lazy?: boolean;
  // Image principale de la page (fiche album) : téléchargée avant les autres
  priority?: boolean;
  // Largeur affichée, pour que le navigateur choisisse la bonne taille d'image
  sizes?: string;
}) {
  // Adresses déjà en échec : une nouvelle pochette (autre carte au même endroit) repart de zéro
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallback].map(secure).find((url): url is string => Boolean(url) && !failed.includes(url!));

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
    <Image
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : lazy ? "lazy" : undefined}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      onError={markFailed}
      // L'image a pu échouer avant que React prenne la main sur la page : onError ne se déclencherait jamais
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) markFailed();
      }}
    />
  );
}
