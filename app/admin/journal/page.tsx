import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { listAdminActions } from "@/lib/admin";
import { AdminTabs, shortDate } from "../admin-tabs";
import { requireAdmin } from "../guard";

export const metadata: Metadata = { title: "Journal | Admin", robots: { index: false, follow: false } };

// Les 200 dernières actions faites depuis l'admin (gardées un an)
export default async function AdminLogPage() {
  await requireAdmin();
  const actions = await listAdminActions({ limit: 200 });

  return (
    <>
      <SiteNav />
      <main className="game-page">
        <h1>Journal</h1>
        <p className="sub">Qui a fait quoi depuis l&apos;admin. Gardé un an.</p>
        <AdminTabs current="/admin/journal" />
        <ul className="adm-log">
          {actions.length === 0 && <li className="empty">Aucune action pour l&apos;instant.</li>}
          {actions.map((entry) => (
            <li key={entry.id}>
              <span className="adm-when">{shortDate(entry.created_at)}</span>
              <strong>{entry.action}</strong> par {entry.admin_pseudo}
              {entry.target_pseudo && (
                <>
                  {" "}sur{" "}
                  {entry.action === "suppression" || !entry.target_id ? (
                    entry.target_pseudo
                  ) : (
                    <Link href={`/admin/joueurs/${entry.target_id}`}>{entry.target_pseudo}</Link>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
