import { db } from "@/lib/db";
import { inactivityEmail } from "@/lib/email-templates";
import { INACTIVE_YEARS, INACTIVITY_NOTICE_DAYS } from "@/lib/legal";
import { sendMail } from "@/lib/mailer";
import { redis } from "@/lib/redis";
import { absoluteUrl } from "@/lib/seo";

// Données personnelles d'un joueur (lot R1, RGPD) : export, suppression du compte, comptes inactifs.

// Toutes les tables qui pointent vers un joueur. Chacune doit figurer dans l'export et être en ON DELETE CASCADE :
// un test compare cette liste à la base, pour qu'une nouvelle table ne soit pas oubliée.
export const USER_TABLES = [
  "users",
  "pack_stocks",
  "user_albums",
  "pack_openings",
  "friendships",
  "trades",
  "listings",
  "user_quests",
  "email_verifications",
  "password_resets",
  "daily_draws",
  "artist_set_rewards",
  "user_achievements",
] as const;

async function rows<T>(sql: string, userId: string) {
  return (await db.query<T & Record<string, unknown>>(sql, [userId])).rows;
}

// Tout ce que le site sait d'un joueur, lisible par un humain (clés en français) et réutilisable (JSON).
// Jamais l'empreinte du mot de passe ni celles des liens envoyés par e-mail : seulement leur date d'expiration.
export async function exportUserData(userId: string) {
  const [account] = await rows<{ pseudo: string }>(
    `select pseudo, email, email_verified_at as email_verifie_le, created_at as inscrit_le,
            terms_accepted_at as cgu_acceptees_le, last_seen_at as derniere_visite,
            case when password_hash is null then 'Google' else 'e-mail et mot de passe' end as connexion,
            coins as pieces, auto_reveal as reglage_revelation_auto
     from users where id = $1`,
    userId,
  );
  if (!account) return null;

  const [packs, collection, openings, friends, trades, listings, quests, draws, sets, achievements, links] = await Promise.all([
    rows(
      `select stock as packs_en_reserve, last_recharged_at as dernier_rechargement,
              bonus_packs as packs_gagnes, solo_packs as packs_solo
       from pack_stocks where user_id = $1`,
      userId,
    ),
    rows(
      `select a.title as album, a.artist as artiste, ua.count as exemplaires, ua.first_obtained_at as obtenu_le
       from user_albums ua join albums a on a.id = ua.album_id
       where ua.user_id = $1 order by ua.first_obtained_at`,
      userId,
    ),
    rows(
      `select po.opened_at as ouvert_le,
              array(select a.title || ' (' || a.artist || ')' from unnest(po.album_ids) with ordinality as x(id, n)
                    join albums a on a.id = x.id order by x.n) as albums
       from pack_openings po where po.user_id = $1 order by po.opened_at`,
      userId,
    ),
    rows(
      `select u.pseudo as joueur, f.status as statut, f.requester_id = $1 as demande_envoyee_par_moi, f.created_at as depuis
       from friendships f
       join users u on u.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end
       where $1 in (f.requester_id, f.addressee_id) order by f.created_at`,
      userId,
    ),
    rows(
      `select case when t.proposer_id = $1 then 'proposé par moi' else 'reçu' end as sens,
              u.pseudo as autre_joueur, oa.title as album_offert, t.offer_coins as pieces_offertes,
              ra.title as album_demande, t.request_coins as pieces_demandees,
              t.status as statut, t.created_at as cree_le, t.resolved_at as termine_le
       from trades t
       join users u on u.id = case when t.proposer_id = $1 then t.receiver_id else t.proposer_id end
       left join albums oa on oa.id = t.offer_album_id
       left join albums ra on ra.id = t.request_album_id
       where $1 in (t.proposer_id, t.receiver_id) order by t.created_at`,
      userId,
    ),
    rows(
      `select a.title as album, l.price_coins as prix, w.title as album_voulu_en_echange,
              l.status as statut, l.created_at as creee_le, l.closed_at as fermee_le
       from listings l join albums a on a.id = l.album_id left join albums w on w.id = l.wanted_album_id
       where l.seller_id = $1 order by l.created_at`,
      userId,
    ),
    rows(
      `select quest_key as quete, period_start as periode, progress as progression, claimed as recompense_recuperee
       from user_quests where user_id = $1 order by period_start, quest_key`,
      userId,
    ),
    rows(
      `select d.draw_date as jour, a.title as album, d.guess_title as reponse, d.solved as trouve, d.streak as serie
       from daily_draws d join albums a on a.id = d.album_id where d.user_id = $1 order by d.draw_date`,
      userId,
    ),
    rows(
      `select artist as artiste, set_size as albums_du_set, coins as pieces, pack, claimed_at as recupere_le
       from artist_set_rewards where user_id = $1 order by claimed_at`,
      userId,
    ),
    rows(
      `select key as succes, reward as pieces, unlocked_at as debloque_le
       from user_achievements where user_id = $1 order by unlocked_at`,
      userId,
    ),
    rows(
      `select (select expires_at from email_verifications where user_id = $1) as lien_verification_expire_le,
              (select expires_at from password_resets where user_id = $1) as lien_mot_de_passe_expire_le`,
      userId,
    ),
  ]);

  return {
    site: "Album",
    exporte_le: new Date().toISOString(),
    compte: account,
    packs: packs[0] ?? null,
    collection,
    ouvertures_de_packs: openings,
    amis: friends,
    echanges: trades,
    annonces_du_marche: listings,
    quetes: quests,
    pioches_du_jour: draws,
    collections_artiste: sets,
    succes: achievements,
    liens_envoyes_par_email: links[0],
  };
}

// Supprime le joueur et, par ON DELETE CASCADE, tout ce qui lui appartient : collection, amis, échanges,
// annonces, quêtes... Les ventes passées du marché restent, sans lien avec le joueur (table market_sales).
export async function deleteAccount(userId: string) {
  const result = await db.query("delete from users where id = $1", [userId]);
  await forgetCachedPseudos();
  return (result.rowCount ?? 0) > 0;
}

// Le classement est gardé 5 minutes en cache avec les pseudos : on l'efface pour que le joueur supprimé disparaisse tout de suite
async function forgetCachedPseudos() {
  try {
    const keys = await redis.keys("leaderboard:*");
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis indisponible : le cache expirera de lui-même
  }
}

// Dernière activité : dernière visite, ou inscription si le joueur n'est pas revenu depuis ce lot
const LAST_ACTIVITY = "coalesce(last_seen_at, created_at)";

// Comptes inactifs (à lancer chaque jour en production, npm run purge:inactive) :
// 1. un e-mail prévient les joueurs absents depuis 3 ans moins 30 jours ;
// 2. un compte toujours absent 30 jours après cet e-mail est supprimé ;
// 3. les liens de vérification et de mot de passe expirés sont effacés.
export async function purgeInactiveAccounts({ dryRun = false, log = console.log } = {}) {
  const notify = await db.query<{ id: string; email: string; pseudo: string }>(
    `select id, email, pseudo from users
     where ${LAST_ACTIVITY} < now() - make_interval(years => $1) + make_interval(days => $2)
       and (inactivity_notice_at is null or inactivity_notice_at < ${LAST_ACTIVITY})`,
    [INACTIVE_YEARS, INACTIVITY_NOTICE_DAYS],
  );
  // Prévenu, et pas revenu depuis l'e-mail
  const doomedWhere = `${LAST_ACTIVITY} < now() - make_interval(years => $1)
       and inactivity_notice_at >= ${LAST_ACTIVITY}
       and inactivity_notice_at < now() - make_interval(days => $2)`;
  const doomed = await db.query(`select id from users where ${doomedWhere}`, [INACTIVE_YEARS, INACTIVITY_NOTICE_DAYS]);
  log(`Comptes inactifs : ${notify.rowCount} à prévenir, ${doomed.rowCount} à supprimer.`);
  if (dryRun) return { notified: 0, deleted: 0 };

  let notified = 0;
  for (const user of notify.rows) {
    try {
      await sendMail({
        to: user.email,
        ...inactivityEmail({ pseudo: user.pseudo, link: absoluteUrl("/connexion"), days: INACTIVITY_NOTICE_DAYS, years: INACTIVE_YEARS }),
      });
      await db.query("update users set inactivity_notice_at = now() where id = $1", [user.id]);
      notified += 1;
    } catch (error) {
      // Sans e-mail envoyé, le compte n'est pas supprimé : il sera retenté au prochain passage
      log(`E-mail d'inactivité impossible pour le compte ${user.id} : ${error instanceof Error ? error.message : error}`);
    }
  }

  // Mêmes conditions que plus haut, revérifiées au moment d'effacer (un joueur a pu revenir entre-temps)
  const deleted = (await db.query(`delete from users where ${doomedWhere}`, [INACTIVE_YEARS, INACTIVITY_NOTICE_DAYS])).rowCount ?? 0;
  if (deleted > 0) await forgetCachedPseudos();

  await db.query("delete from email_verifications where expires_at < now()");
  await db.query("delete from password_resets where expires_at < now()");
  return { notified, deleted };
}
