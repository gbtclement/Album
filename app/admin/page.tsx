import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/game-ui";
import { SearchIcon } from "@/components/icons";
import { SiteNav } from "@/components/site-nav";
import { ADMIN_PAGE_SIZE, listUsers } from "@/lib/admin";
import { AdminTabs, shortDate } from "./admin-tabs";
import { requireAdmin } from "./guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ q?: string; page?: string; message?: string }> };

// Liste des joueurs inscrits : recherche par pseudo ou e-mail, 50 par page, lien vers la fiche de chacun
export default async function AdminPage({ searchParams }: Props) {
  await requireAdmin();
  const { q = "", page: pageParam, message } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { users, total } = await listUsers({ query: q, page });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const pageLink = (target: number) => `/admin?${new URLSearchParams({ ...(q ? { q } : {}), page: String(target) })}`;
  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <h1>Admin</h1>
        <p className="sub">{total.toLocaleString("fr-FR")} compte{total > 1 ? "s" : ""}{q ? ` pour « ${q} »` : " inscrits"}</p>
        <AdminTabs current="/admin" />

        <form className="searchbar" role="search" action="/admin">
          <SearchIcon />
          <input type="search" name="q" defaultValue={q} placeholder="Pseudo ou adresse e-mail" aria-label="Chercher un joueur" />
        </form>

        <div className="stack">
          {users.length === 0 && <p className="empty">Aucun compte ne correspond.</p>}
          {users.map((user) => {
            return (
              <Link key={user.id} href={`/admin/joueurs/${user.id}`} className="item adm-user">
                <Avatar name={user.pseudo} />
                <div className="l">
                  <strong>
                    {user.pseudo}
                    {user.role === "admin" && <span className="adm-tag gold">Admin</span>}
                    {user.premium_active && <span className="adm-tag epic">Premium</span>}
                    {!user.email_verified_at && <span className="adm-tag">Non vérifié</span>}
                  </strong>
                  <small>{user.email}</small>
                  <small>Inscrit le {shortDate(user.created_at)} · vu le {shortDate(user.last_seen_at)}</small>
                </div>
                <div className="r adm-nums">
                  <span>{user.cards.toLocaleString("fr-FR")} cartes</span>
                  <span>{user.coins.toLocaleString("fr-FR")} pièces</span>
                </div>
              </Link>
            );
          })}
        </div>

        {pages > 1 && (
          <nav className="adm-pager" aria-label="Pages">
            {page > 1 ? <Link href={pageLink(page - 1)} className="btn">‹ Précédente</Link> : <span />}
            <span>Page {page} / {pages}</span>
            {page < pages ? <Link href={pageLink(page + 1)} className="btn">Suivante ›</Link> : <span />}
          </nav>
        )}
      </main>
    </>
  );
}
