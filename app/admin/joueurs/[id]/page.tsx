import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/game-ui";
import { SiteNav } from "@/components/site-nav";
import { getUserForAdmin, isUuid, listAdminActions } from "@/lib/admin";
import { deleteUserAction, forceLogoutAction, grantPremiumAction, updateUserAction } from "../../actions";
import { AdminTabs, shortDate } from "../../admin-tabs";
import { requireAdmin } from "../../guard";

export const metadata: Metadata = { title: "Fiche joueur | Admin", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> };

// Détails d'un changement du journal, lisibles : « pieces : 50 → 999 »
function describe(details: Record<string, unknown>) {
  return Object.entries(details)
    .map(([key, value]) => (Array.isArray(value) ? `${key} : ${String(value[0])} → ${String(value[1])}` : `${key} : ${String(value)}`))
    .join(" · ");
}

export default async function AdminUserPage({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { message } = await searchParams;
  if (!isUuid(id)) notFound();
  const user = await getUserForAdmin(id);
  if (!user) notFound();
  const history = await listAdminActions({ targetId: id, limit: 20 });
  const premium = user.premium_active;
  const self = user.id === admin.id;

  return (
    <>
      <SiteNav message={message} />
      <main className="game-page">
        <AdminTabs current="/admin" />
        <Link href="/admin" className="adm-back">‹ Tous les joueurs</Link>

        <div className="adm-head">
          <Avatar name={user.pseudo} />
          <div className="l">
            <h1>{user.pseudo}</h1>
            <p className="sub">{user.email}</p>
          </div>
        </div>

        <dl className="adm-facts">
          <div><dt>Rôle</dt><dd>{user.role === "admin" ? "Admin" : "Joueur"}</dd></div>
          <div><dt>Inscrit le</dt><dd>{shortDate(user.created_at)}</dd></div>
          <div><dt>Dernière visite</dt><dd>{shortDate(user.last_seen_at)}</dd></div>
          <div><dt>Cartes</dt><dd>{user.cards.toLocaleString("fr-FR")} ({user.albums.toLocaleString("fr-FR")} albums)</dd></div>
          <div><dt>Packs ouverts (7 j)</dt><dd>{user.openings_7d.toLocaleString("fr-FR")}</dd></div>
          <div><dt>Premium</dt><dd>{premium ? `jusqu'au ${shortDate(user.premium_until)}` : "non"}</dd></div>
          <div><dt>Mois offert</dt><dd>{user.premium_trial_used_at ? `utilisé le ${shortDate(user.premium_trial_used_at)}` : "pas encore utilisé"}</dd></div>
        </dl>
        <p className="field-hint">Le rôle admin se donne ou se retire uniquement dans la base de données.</p>

        <h2 className="label">Informations</h2>
        <form action={updateUserAction} className="adm-form">
          <input type="hidden" name="id" value={user.id} />
          <label className="field-label">Pseudo<input className="field" name="pseudo" defaultValue={user.pseudo} required minLength={3} maxLength={20} /></label>
          <label className="field-label">Adresse e-mail<input className="field" type="email" name="email" defaultValue={user.email} required /></label>
          <label className="field-label">Pièces<input className="field" type="number" name="coins" min={0} step={1} defaultValue={user.coins} required /></label>
          <label className="adm-check"><input type="checkbox" name="verified" defaultChecked={Boolean(user.email_verified_at)} /> Adresse e-mail vérifiée</label>
          <button type="submit" className="btn gold">Enregistrer</button>
        </form>

        <h2 className="label">Premium offert</h2>
        <p className="field-hint">Ne passe pas par l&apos;abonnement et ne consomme pas le mois offert du joueur. Les jours s&apos;ajoutent au premium en cours.</p>
        <form action={grantPremiumAction} className="adm-row">
          <input type="hidden" name="id" value={user.id} />
          <button type="submit" name="days" value="7" className="btn">+ 7 jours</button>
          <button type="submit" name="days" value="30" className="btn">+ 30 jours</button>
          <button type="submit" name="days" value="365" className="btn">+ 1 an</button>
          {premium && <button type="submit" name="days" value="0" className="btn red">Retirer</button>}
        </form>
        <form action={grantPremiumAction} className="adm-row">
          <input type="hidden" name="id" value={user.id} />
          <label className="field-label adm-days">Autre durée (jours)<input className="field" type="number" name="days" min={1} max={3650} step={1} required /></label>
          <button type="submit" className="btn gold">Offrir</button>
        </form>

        <h2 className="label">Sécurité</h2>
        <form action={forceLogoutAction} className="adm-row">
          <input type="hidden" name="id" value={user.id} />
          <button type="submit" className="btn">Déconnecter de tous ses appareils</button>
        </form>

        {!self && (
          <details className="adm-danger">
            <summary>Supprimer le compte</summary>
            <p>Définitif : collection, amis, échanges, annonces et progression disparaissent. Tape <strong>{user.pseudo}</strong> pour confirmer.</p>
            <form action={deleteUserAction} className="adm-row">
              <input type="hidden" name="id" value={user.id} />
              <input className="field" name="confirm" placeholder={user.pseudo} aria-label="Pseudo du compte à supprimer" autoComplete="off" required />
              <button type="submit" className="btn red">Supprimer</button>
            </form>
          </details>
        )}

        <h2 className="label">Journal de ce compte</h2>
        <ul className="adm-log">
          {history.length === 0 && <li className="empty">Aucune action admin sur ce compte.</li>}
          {history.map((entry) => (
            <li key={entry.id}>
              <span className="adm-when">{shortDate(entry.created_at)}</span>
              <strong>{entry.action}</strong> par {entry.admin_pseudo}
              {Object.keys(entry.details).length > 0 && <small>{describe(entry.details)}</small>}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
