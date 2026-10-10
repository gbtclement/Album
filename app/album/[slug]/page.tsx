import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PriceChart } from "@/components/price-chart";
import { SiteNav } from "@/components/site-nav";
import { findAlbumBySlug, type AlbumLinks } from "@/lib/catalog";
import { getOwnedCount } from "@/lib/collection";
import { getAlbumCote } from "@/lib/market";
import { RARITY_LABELS, RARITY_POINTS } from "@/lib/rarity";
import { absoluteUrl, jsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

const PLATFORMS: Array<{ key: keyof AlbumLinks; label: string }> = [
  { key: "spotify", label: "Spotify" },
  { key: "deezer", label: "Deezer" },
  { key: "youtube", label: "YouTube" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const album = await findAlbumBySlug(slug);
  if (!album) return { title: "Album introuvable" };

  return {
    title: `${album.title} — ${album.artist}`,
    description: `${album.title} de ${album.artist}${album.release_year ? ` (${album.release_year})` : ""} : découvre cet album dans Album, le jeu de collection d'albums.`,
    alternates: { canonical: `/album/${album.slug}` },
    openGraph: {
      type: "music.album",
      title: `${album.title} — ${album.artist}`,
      images: album.cover_url ? [album.cover_url] : undefined,
    },
  };
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params;
  const album = await findAlbumBySlug(slug);
  if (!album) notFound();

  const session = await auth();
  const [owned, cote] = await Promise.all([
    session?.user?.id ? getOwnedCount(session.user.id, album.id) : Promise.resolve(null),
    getAlbumCote(album.id),
  ]);
  const listens = album.listen_count ? Number(album.listen_count) : null;

  // Données structurées (schema.org) : aident les moteurs à comprendre la fiche
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name: album.title,
    byArtist: { "@type": "MusicGroup", name: album.artist },
    ...(album.release_year ? { datePublished: String(album.release_year) } : {}),
    ...(album.cover_url ? { image: album.cover_url } : {}),
    url: absoluteUrl(`/album/${album.slug}`),
  };

  return (
    <>
      <SiteNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <main className={`game-page narrow tier-${album.rarity_tier}`}>
        <div className="sheet-top" style={{ alignItems: "flex-start", marginTop: 8 }}>
          <span className="cover" style={{ width: "min(220px, 42vw)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- pochettes servies par Cover Art Archive */}
            {album.cover_url && <img src={album.cover_url} alt={`Pochette de ${album.title}`} />}
          </span>
          <div style={{ minWidth: 0 }}>
            <span className="tier-tag">{RARITY_LABELS[album.rarity_tier]}</span>
            <h1>{album.title}</h1>
            <p className="sub">{album.artist}{album.release_year ? ` · ${album.release_year}` : ""}</p>
            {owned !== null && (
              <p className="sub">
                {owned > 0 ? `Tu possèdes ${owned} exemplaire${owned > 1 ? "s" : ""}` : "Pas encore dans ta collection"}
              </p>
            )}
          </div>
        </div>

        <div className="facts" style={{ marginTop: 14 }}>
          <div className="fact"><b>{listens !== null ? listens.toLocaleString("fr-FR") : "—"}</b><small>Écoutes</small></div>
          <div className="fact"><b><i className="coin-i" aria-hidden="true" />{cote.cote ? Number(cote.cote).toLocaleString("fr-FR") : "—"}</b><small>Cote</small></div>
          <div className="fact"><b>{RARITY_POINTS[album.rarity_tier]}</b><small>Points</small></div>
        </div>
        <p className="sub" style={{ marginTop: 6 }}>Écoutes ListenBrainz : plus un album est écouté, plus sa carte est rare.</p>

        <div className="listen" style={{ marginTop: 8 }}>
          {PLATFORMS.map(({ key, label }) => {
            const link = album.links[key];
            if (!link) return null;
            return (
              <a key={key} href={link.url} target="_blank" rel="noopener noreferrer" className={link.exact ? "" : "search"}>
                {link.exact ? `Écouter sur ${label}` : `Chercher sur ${label}`}
              </a>
            );
          })}
        </div>

        {owned !== null && owned > 0 && (
          <div className="sheet-actions" style={{ marginTop: 14 }}>
            <Link href={`/marche/vendre?album=${album.slug}`} className="btn gold">Mettre en vente</Link>
            <Link href="/amis" className="btn">Proposer en échange</Link>
          </div>
        )}

        <div className="label">Historique des ventes (90 jours)</div>
        <div className="chart-card">
          <PriceChart endpoint={`/api/market/history?album=${album.slug}&jours=90`} label={album.title} />
        </div>
      </main>
    </>
  );
}
