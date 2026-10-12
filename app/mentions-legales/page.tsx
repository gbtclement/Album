import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { legalInfo } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et sources des données musicales du jeu Musicodex.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  const { publisher, contactEmail, host } = legalInfo();

  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        Musicodex est un jeu gratuit, avec un abonnement premium facultatif (voir les <Link href="/cgv">conditions de vente</Link>), édité
        par <strong>{publisher}</strong>, qui en est aussi le directeur de la publication.
        <br />
        Contact : <strong>{contactEmail}</strong>
      </p>

      <h2>Hébergeur</h2>
      <p>{host}</p>

      <h2>Données musicales et pochettes</h2>
      <p>
        Les informations sur les albums viennent de <a href="https://musicbrainz.org">MusicBrainz</a> (projet de la fondation MetaBrainz) et de{" "}
        <a href="https://www.last.fm">Last.fm</a>, qui donne aussi le nombre d&apos;écoutes, et les pochettes du <a href="https://coverartarchive.org">Cover Art Archive</a> ou de{" "}
        <a href="https://www.deezer.com">Deezer</a>, d&apos;où viennent aussi les photos des artistes.
      </p>
      <p>
        Les noms d&apos;albums et d&apos;artistes, les pochettes et les photos d&apos;artistes appartiennent à leurs auteurs et ayants droit. Ils sont montrés pour
        illustrer chaque carte, sans usage commercial. Musicodex n&apos;est lié à aucun de ces services, artistes ou labels. Un ayant droit
        qui souhaite le retrait d&apos;une pochette peut écrire à l&apos;adresse de contact ci-dessus.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Ce que le jeu enregistre sur toi et comment exercer tes droits : voir la <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
    </LegalPage>
  );
}
