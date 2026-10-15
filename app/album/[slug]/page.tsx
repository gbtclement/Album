import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { CoverImage } from "@/components/cover-image";
import { PriceChart } from "@/components/price-chart";
import { SiteNav } from "@/components/site-nav";
import { formatCompact, smallCover } from "@/components/game-ui";
import { findAlbumBySlug, findAlbumsByArtist, type AlbumLinks } from "@/lib/catalog";
import { getOwnedCount } from "@/lib/collection";
import { getDust } from "@/lib/dust";
import { craftCost } from "@/lib/dust-rules";
import { craftAlbumAction } from "@/app/collection/actions";
import { getAlbumCote } from "@/lib/market";
import { RARITY_LABELS, RARITY_POINTS } from "@/lib/rarity";
import { absoluteUrl, jsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string }>;
};

const PLATFORMS: Array<{ key: keyof AlbumLinks; label: string }> = [
  { key: "spotify", label: "Spotify" },
  { key: "deezer", label: "Deezer" },
  { key: "youtube", label: "YouTube" },
];

// Une seule requête par affichage : les métadonnées et la page lisent le même album
const getAlbum = cache(findAlbumBySlug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const album = await getAlbum(slug);
  if (!album) return { title: "Album introuvable", robots: { index: false } };

  return {
    title: `${album.title} — ${album.artist}`,
    description: `${album.title} de ${album.artist}${album.release_year ? ` (${album.release_year})` : ""}, carte ${RARITY_LABELS[album.rarity_tier].toLowerCase()} du jeu Musicodex : écoute-le, suis sa cote et ajoute-le à ta collection.`,
    alternates: { canonical: `/album/${album.slug}` },
    openGraph: {
      type: "music.album",
      title: `${album.title} — ${album.artist}`,
      url: `/album/${album.slug}`,
      images: album.cover_url ? [{ url: album.cover_url, width: 500, height: 500, alt: `Pochette de ${album.title}` }] : undefined,
    },
  };
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { message } = await searchParams;
  const album = await getAlbum(slug);
  if (!album) notFound();

  const session = await auth();
  const [owned, cote, sameArtist, dust] = await Promise.all([
    session?.user?.id ? getOwnedCount(session.user.id, album.id) : Promise.resolve(null),
    getAlbumCote(album.id),
    findAlbumsByArtist(album.artist, album.id),
    session?.user?.id ? getDust(session.user.id) : Promise.resolve(0),
  ]);
  const cost = craftCost(album.rarity_tier);
  // Écoutes Last.fm, toutes versions de l'album additionnées : ce sont elles qui fixent la rareté
  const listens = album.lastfm_playcount ? Number(album.lastfm_playcount) : null;

  // Données structurées (schema.org) : aident les moteurs à comprendre la fiche
  // Fil d'Ariane : Accueil > Albums de l'artiste > Album
  const url = absoluteUrl(`/album/${album.slug}`);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MusicAlbum",
        "@id": `${url}#album`,
        name: album.title,
        url,
        byArtist: { "@type": "MusicGroup", name: album.artist },
        albumProductionType: "https://schema.org/StudioAlbum",
        ...(album.release_year ? { datePublished: String(album.release_year) } : {}),
        ...(album.cover_url ? { image: album.cover_url } : {}),
        sameAs: [`https://musicbrainz.org/release-group/${album.mbid}`],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: album.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <SiteNav message={message} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <main className={`game-page narrow tier-${album.rarity_tier}`}>
        <div className="sheet-top" style={{ alignItems: "flex-start", marginTop: 8 }}>
          <span className="cover" style={{ width: "min(220px, 42vw)" }}>
            <CoverImage src={album.cover_url} title={album.title} alt={`Pochette de ${album.title}`} sizes="(min-width: 600px) 220px, 42vw" priority />
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
          <div className="fact"><b>{listens !== null ? formatCompact(listens) : "—"}</b><small>Écoutes Last.fm</small></div>
          <div className="fact"><b><i className="coin-i" aria-hidden="true" />{cote.cote ? Number(cote.cote).toLocaleString("fr-FR") : "—"}</b><small>Cote</small></div>
          <div className="fact"><b>{RARITY_POINTS[album.rarity_tier]}</b><small>Points</small></div>
        </div>
        <p className="sub" style={{ marginTop: 6 }}>
          {listens !== null
            ? `Écoutes comptées sur Last.fm, toutes versions de l'album confondues (remasterisée, deluxe...)${album.lastfm_listeners ? ` par ${formatCompact(Number(album.lastfm_listeners))} auditeurs` : ""} (et non sur Spotify, qui ne publie pas ses chiffres). `
            : "Écoutes pas encore connues sur Last.fm. "}
          Plus un album est écouté, plus sa carte est rare.
        </p>

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

        {/* Fabrication avec la poussière de vinyle (doublons pressés dans la collection) */}
        {owned === 0 && (
          <div className="craft">
            <span className="dust-i" aria-hidden="true" style={{ width: 30, height: 30 }} />
            <div className="l">
              <strong>Fabriquer cet album : {cost.toLocaleString("fr-FR")} poussières</strong>
              Tu en as {dust.toLocaleString("fr-FR")}. Presse tes doublons dans ta collection pour en gagner.
            </div>
            <form action={craftAlbumAction}>
              <input type="hidden" name="slug" value={album.slug} />
              <button type="submit" className="btn gold" disabled={dust < cost}>Fabriquer</button>
            </form>
          </div>
        )}

        <h2 className="label">Historique des ventes (90 jours)</h2>
        <div className="chart-card">
          <PriceChart endpoint={`/api/market/history?album=${album.slug}&jours=90`} label={album.title} />
        </div>

        {sameArtist.length > 0 && (
          <>
            <h2 className="label">Du même artiste</h2>
            <ul className="cards plain">
              {sameArtist.map((other) => (
                <li key={other.slug}>
                  <Link href={`/album/${other.slug}`} className={`card tier-${other.rarity_tier}`}>
                    <span className="cover">
                      <CoverImage src={smallCover(other.cover_url)} fallback={other.cover_url} title={other.title} lazy />
                    </span>
                    <span className="t">{other.title}</span>
                    <span className="a">{other.release_year ?? RARITY_LABELS[other.rarity_tier]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
