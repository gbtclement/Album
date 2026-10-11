import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CoverImage } from "@/components/cover-image";
import { LegalLinks } from "@/components/legal-links";
import { smallCover } from "@/components/game-ui";
import { db } from "@/lib/db";
import { MAX_STOCK, PACK_SIZE } from "@/lib/pack-rules";
import { RARITY_LABELS, type RarityTier } from "@/lib/rarity";
import { absoluteUrl, jsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Musicodex : le jeu de cartes des albums de musique" },
  description:
    "Ouvre des packs d'albums de musique, collectionne les légendaires, échange-les avec tes amis et suis leur cote en bourse. Gratuit, dans le navigateur.",
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Ouvre des packs", text: `Un pack de ${PACK_SIZE} cartes se recharge toutes les 5 minutes, jusqu'à ${MAX_STOCK} en réserve. Chaque carte est un vrai album.` },
  { title: "Collectionne", text: "Plus un album est écouté dans le monde, plus sa carte est rare : commune, peu commune, rare, épique ou légendaire." },
  { title: "Échange et revends", text: "Troque avec tes amis, vends au marché en pièces et suis la cote de chaque album en bourse." },
  { title: "Grimpe au classement", text: "Chaque album possédé rapporte des points selon sa rareté. Les quêtes donnent des pièces et des packs." },
];

type Props = {
  searchParams: Promise<{ compte?: string }>;
};

export default async function Home({ searchParams }: Props) {
  // Un joueur connecté arrive directement dans sa collection
  const session = await auth();
  if (session?.user?.id) redirect("/collection");
  // Retour ici juste après la suppression d'un compte (app/profil/supprimer)
  const accountDeleted = (await searchParams).compte === "supprime";

  // Quelques légendaires du catalogue : de vraies pages à découvrir (et des liens internes pour les moteurs)
  const { rows: legends } = await db.query<{ slug: string; title: string; artist: string; cover_url: string | null; rarity_tier: RarityTier }>(
    `select slug, title, artist, cover_url, rarity_tier from albums
     where rarity_tier = 'legendaire' order by listen_count desc nulls last limit 6`,
  );

  // Données structurées : le site (WebSite) et le jeu lui-même (VideoGame, gratuit, dans le navigateur)
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#site"),
        url: absoluteUrl("/"),
        name: "Musicodex",
        inLanguage: "fr-FR",
      },
      {
        "@type": "VideoGame",
        name: "Musicodex",
        url: absoluteUrl("/"),
        description: "Jeu de collection de cartes d'albums de musique : packs, raretés, échanges, marché et bourse.",
        genre: ["Jeu de cartes à collectionner", "Musique"],
        gamePlatform: "Navigateur web",
        applicationCategory: "GameApplication",
        operatingSystem: "Tous (navigateur web)",
        inLanguage: "fr-FR",
        isPartOf: { "@id": absoluteUrl("/#site") },
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      },
    ],
  };

  return (
    <main className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <section className="landing-hero">
        {accountDeleted && (
          <p role="status" className="auth-success landing-notice">Ton compte et toutes ses données ont été supprimés. À bientôt peut-être !</p>
        )}
        <div className="big-pack" aria-hidden="true">
          <div className="disc">
            <div className="disc-rot"><span className="hub" /></div>
            <span className="sheen" />
          </div>
        </div>
        <h1>Musicodex</h1>
        <p>Ouvre des packs, collectionne les albums qui ont marqué la musique, échange-les avec tes amis et grimpe au classement.</p>
        <div className="pack-actions">
          <Link href="/inscription" className="btn lg gold">Créer un compte</Link>
          <Link href="/connexion" className="btn lg alt">Se connecter</Link>
        </div>
      </section>

      <section className="landing-more" aria-labelledby="comment">
        <h2 id="comment">Comment ça marche</h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <b aria-hidden="true">{index + 1}</b>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {legends.length > 0 && (
        <section className="landing-more" aria-labelledby="legendes">
          <h2 id="legendes">Quelques cartes légendaires</h2>
          <p className="landing-lead">Les albums les plus écoutés du catalogue : les plus durs à trouver dans un pack.</p>
          <ul className="cards">
            {legends.map((album) => (
              <li key={album.slug}>
                <Link href={`/album/${album.slug}`} className={`card tier-${album.rarity_tier}`}>
                  <span className="cover">
                    <CoverImage src={smallCover(album.cover_url)} fallback={album.cover_url} title={album.title} alt={`Pochette de ${album.title}`} lazy />
                  </span>
                  <span className="t">{album.title}</span>
                  <span className="a">{album.artist} · {RARITY_LABELS[album.rarity_tier]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="landing-foot">
        <Link href="/inscription" className="btn gold">Commencer à jouer</Link>
        <p>Pièces 100 % virtuelles, sans achat. Données musicales : ListenBrainz, MusicBrainz, Last.fm, Cover Art Archive.</p>
        <LegalLinks />
      </footer>
    </main>
  );
}
