import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { findSuspects } from "@/lib/cheat-detection";
import { AdminTabs, shortDate } from "../admin-tabs";
import { requireAdmin } from "../guard";

export const metadata: Metadata = { title: "Triche | Admin", robots: { index: false, follow: false } };

// Comptes suspects, du plus au moins suspect. Rien n'est sanctionné automatiquement : c'est une liste à examiner.
export default async function AdminCheatPage() {
  await requireAdmin();
  const suspects = await findSuspects();

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Triche</h1>
        <p className="sub">Comptes au comportement inhabituel (packs sur 7 jours, pioche sur 14 jours, échanges sur 30 jours). Une piste à vérifier, pas une preuve.</p>
        <AdminTabs current="/admin/triche" />

        <div className="stack">
          {suspects.length === 0 && <p className="empty">Aucun compte suspect en ce moment.</p>}
          {suspects.map((suspect) => (
            <Link key={suspect.id} href={`/admin/joueurs/${suspect.id}`} className="adm-suspect">
              <span className={`adm-score${suspect.score >= 50 ? " high" : ""}`} aria-label={`Score de suspicion ${suspect.score} sur 100`}>
                {suspect.score}
              </span>
              <div className="l">
                <strong>{suspect.pseudo}</strong>
                <small>{suspect.email} · inscrit le {shortDate(suspect.created_at)} · {suspect.openings7d} packs en 7 jours</small>
                <ul>
                  {suspect.reasons.map((reason) => (
                    <li key={reason.key}>{reason.text}</li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="label">Comment c&apos;est calculé</h2>
        <ul className="adm-help">
          <li><strong>Réflexe surhumain (30 pts)</strong> : au moins 20 packs ouverts moins de 15 s après leur recharge, et la moitié des ouvertures ou plus.</li>
          <li><strong>Métronome (20 pts)</strong> : écarts entre ouvertures presque identiques (variation de moins de 15 %).</li>
          <li><strong>Jamais endormi (20 pts)</strong> : des ouvertures pendant au moins 20 heures différentes d&apos;une même journée, 2 jours ou plus.</li>
          <li><strong>Pioche trop parfaite (15 pts)</strong> : au moins 7 pioches, toutes réussies, en moins de 8 s en général.</li>
          <li><strong>Comptes « mules » (15 pts)</strong> : 3 comptes de moins de 30 jours ou plus qui lui donnent cartes ou pièces (échange à sens unique, achat à plus de 3 fois la cote) et échangent presque uniquement avec lui.</li>
        </ul>
      </main>
    </>
  );
}
