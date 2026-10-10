import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PriceChart } from "@/components/price-chart";
import { SiteNav } from "@/components/site-nav";
import { findAlbumBySlug, type AlbumLinks } from "@/lib/catalog";
import { getOwnedCount } from "@/lib/collection";
import { RARITY_LABELS } from "@/lib/rarity";
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
  const owned = session?.user?.id ? await getOwnedCount(session.user.id, album.id) : null;
  const playcount = album.lastfm_playcount ? Number(album.lastfm_playcount) : null;

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
      <main className="mx-auto grid max-w-4xl gap-8 px-4 py-8 md:grid-cols-[18rem_1fr]">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-zinc-100">
          {album.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.cover_url} alt={`Pochette de ${album.title}`} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold">{album.title}</h1>
            <p className="text-lg text-zinc-600">{album.artist}</p>
            {album.release_year && <p className="text-sm text-zinc-500">Sorti en {album.release_year}</p>}
          </div>

          <p>
            Rareté : <span className="font-medium">{RARITY_LABELS[album.rarity_tier]}</span>
          </p>

          {playcount !== null && (
            <p className="text-sm text-zinc-600">Écoutes Last.fm : {playcount.toLocaleString("fr-FR")}</p>
          )}

          {owned !== null && (
            <p className="text-sm text-zinc-600">
              {owned > 0 ? `Tu possèdes ${owned} exemplaire${owned > 1 ? "s" : ""}` : "Tu ne possèdes pas encore cet album"}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            {PLATFORMS.map(({ key, label }) => {
              const link = album.links[key];
              if (!link) return null;
              return (
                <a
                  key={key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100"
                >
                  {link.exact ? `Écouter sur ${label}` : `Chercher sur ${label}`}
                </a>
              );
            })}
          </div>
        </div>
        <section className="md:col-span-2">
          <h2 className="mb-3 font-semibold">Historique des ventes (90 jours)</h2>
          <PriceChart endpoint={`/api/market/history?album=${album.slug}&jours=90`} label={album.title} />
        </section>
      </main>
    </>
  );
}
