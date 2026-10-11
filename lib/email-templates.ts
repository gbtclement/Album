import { formatEuros } from "@/lib/premium-offer";
import { absoluteUrl } from "@/lib/seo";

// Modèles des e-mails envoyés par le site : compte (vérification, mot de passe oublié, inactivité)
// et abonnement premium (début, reçu mensuel, fin du mois offert, résiliation, paiement refusé).
// Chaque modèle donne un sujet, une version texte (lue par les messageries simples et les filtres anti-spam)
// et une version HTML aux couleurs du jeu. Le HTML d'e-mail suit des règles à part : tableaux pour la mise
// en page, styles écrits sur chaque balise, pas de police web, images en PNG à adresse complète (pas de SVG).
// Aperçu en développement : /apercu-emails/<modèle> (la liste s'affiche pour un nom inconnu).

export type EmailContent = { subject: string; text: string; html: string };

const COLORS = { night: "#15122a", card: "#2a2550", line: "#3a3466", ink: "#efebfb", muted: "#9a94c2", gold: "#f4b740", goldText: "#2b1d02" };
const FONT = "'Trebuchet MS', 'Segoe UI', Arial, sans-serif";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Date lisible, à l'heure de Paris : « 10 novembre 2026 »
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(date);
}

// Cadre commun : logo, carte, récapitulatif éventuel, bouton doré, lien de secours en clair, pied de page
function layout(options: {
  preheader: string;
  title: string;
  paragraphs: string[];
  details?: Array<[label: string, value: string]>;
  button: { label: string; url: string };
  note: string;
}) {
  const url = escapeHtml(options.button.url);
  const paragraphs = options.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font:16px/1.55 ${FONT};color:${COLORS.ink};">${text}</p>`)
    .join("");
  // Récapitulatif (offre, montant, dates) : une ligne par information, libellé à gauche, valeur à droite
  const details = options.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;border-top:1px solid ${COLORS.line};">${options.details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font:14px ${FONT};color:${COLORS.muted};">${escapeHtml(label)}</td>` +
            `<td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.line};font:bold 14px ${FONT};color:${COLORS.ink};">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.night};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td align="center" style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><img src="${absoluteUrl("/email/logo.png")}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0;"></td>
          <td style="vertical-align:middle;padding-left:10px;font:bold 24px ${FONT};color:${COLORS.ink};">Musicodex</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:18px;padding:28px 24px;">
        <h1 style="margin:0 0 16px;font:bold 24px/1.25 ${FONT};color:${COLORS.ink};">${escapeHtml(options.title)}</h1>
        ${paragraphs}
        ${details}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
          <td style="background:${COLORS.gold};border-radius:12px;border-bottom:3px solid #b9801c;">
            <a href="${url}" style="display:inline-block;padding:13px 26px;font:bold 16px ${FONT};color:${COLORS.goldText};text-decoration:none;">${escapeHtml(options.button.label)}</a>
          </td>
        </tr></table>
        <p style="margin:0 0 6px;font:13px/1.5 ${FONT};color:${COLORS.muted};">Le bouton ne marche pas ? Copie ce lien dans ton navigateur :</p>
        <p style="margin:0;font:13px/1.5 ${FONT};word-break:break-all;"><a href="${url}" style="color:${COLORS.gold};">${url}</a></p>
      </td></tr>
      <tr><td style="padding:18px 8px 0;font:12px/1.5 ${FONT};color:${COLORS.muted};text-align:center;">
        ${escapeHtml(options.note)}<br>Cet e-mail a été envoyé automatiquement, merci de ne pas y répondre.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function verificationEmail({ pseudo, link, hours }: { pseudo: string; link: string; hours: number }): EmailContent {
  const name = escapeHtml(pseudo);
  return {
    subject: "Confirme ton adresse e-mail",
    text:
      `Bienvenue sur Musicodex, ${pseudo} !\n\n` +
      `Pour confirmer ton adresse e-mail, ouvre ce lien (valable ${hours} heures) :\n${link}\n\n` +
      "Ton compte fonctionne déjà : cette confirmation protège ton compte et te permettra de récupérer ton mot de passe.\n\n" +
      "Si tu n'as pas créé de compte sur Musicodex, ignore simplement ce message.",
    html: layout({
      preheader: "Un clic pour confirmer ton adresse et protéger ton compte.",
      title: `Bienvenue, ${pseudo} !`,
      paragraphs: [
        `Ton compte <strong>${name}</strong> est prêt et tes premiers packs t&#39;attendent.`,
        `Confirme ton adresse e-mail pour protéger ton compte : elle te permettra de récupérer ton mot de passe si tu l&#39;oublies. Le lien est valable ${hours} heures.`,
      ],
      button: { label: "Confirmer mon adresse", url: link },
      note: "Tu n'as pas créé de compte sur Musicodex ? Ignore ce message, aucun compte ne sera confirmé.",
    }),
  };
}

// Compte sans visite depuis longtemps : dernier avertissement avant la suppression (voir lib/account.ts)
export function inactivityEmail({ pseudo, link, days, years }: { pseudo: string; link: string; days: number; years: number }): EmailContent {
  return {
    subject: "Ton compte Musicodex va être supprimé",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Tu ne t'es pas connecté à Musicodex depuis près de ${years} ans. Pour ne pas garder tes données sans raison, ` +
      `ton compte et ta collection seront supprimés dans ${days} jours.\n\n` +
      `Pour garder ton compte, il suffit de te connecter avant cette date :\n${link}\n\n` +
      "Si tu ne veux plus jouer, tu n'as rien à faire.",
    html: layout({
      preheader: `Connecte-toi dans les ${days} jours pour garder ta collection.`,
      title: "Tu nous manques !",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        `Tu ne t&#39;es pas connecté à Musicodex depuis près de ${years} ans. Pour ne pas garder tes données sans raison, ton compte et ta collection seront supprimés dans <strong>${days} jours</strong>.`,
        "Pour garder ton compte, il suffit de te connecter avant cette date.",
      ],
      button: { label: "Garder mon compte", url: link },
      note: "Tu ne veux plus jouer ? Tu n'as rien à faire : tout sera effacé automatiquement.",
    }),
  };
}

export function passwordResetEmail({ pseudo, link, minutes }: { pseudo: string; link: string; minutes: number }): EmailContent {
  return {
    subject: "Réinitialise ton mot de passe",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Tu as demandé à changer le mot de passe de ton compte Musicodex. Ouvre ce lien pour en choisir un nouveau (valable ${minutes} minutes) :\n${link}\n\n` +
      "Si tu n'as rien demandé, ignore ce message : ton mot de passe actuel reste valable.",
    html: layout({
      preheader: `Choisis un nouveau mot de passe (lien valable ${minutes} minutes).`,
      title: "Mot de passe oublié ?",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        `Tu as demandé à changer le mot de passe de ton compte. Choisis-en un nouveau avec le bouton ci-dessous. Le lien est valable ${minutes} minutes et ne sert qu&#39;une fois.`,
      ],
      button: { label: "Choisir un nouveau mot de passe", url: link },
      note: "Tu n'as rien demandé ? Ignore ce message : ton mot de passe actuel reste valable.",
    }),
  };
}

// ——— Abonnement premium ———
// Envoyés à partir des événements de paiement (lot PAY2, webhook Stripe), sauf la résiliation, envoyée dès maintenant.
// `link` : page où gérer l'abonnement (profil, rubrique « Mon abonnement »).

const CANCEL_HOW = "Tu peux résilier à tout moment depuis ton profil, rubrique « Mon abonnement ».";

// Début de l'abonnement : avec le mois offert (aucun prélèvement avant renewsAt) ou payé tout de suite
export function premiumStartEmail({ pseudo, link, trial, renewsAt, priceCents }: { pseudo: string; link: string; trial: boolean; renewsAt: Date; priceCents: number }): EmailContent {
  const price = formatEuros(priceCents);
  const date = formatDate(renewsAt);
  const intro = trial
    ? `Ton mois offert commence aujourd'hui : rien ne sera prélevé avant le ${date}. Ensuite, l'abonnement continue à ${price} par mois.`
    : `Ton paiement de ${price} est bien reçu. Ton abonnement sera renouvelé le ${date}, au même prix.`;
  return {
    subject: "Bienvenue dans Musicodex Premium",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Ton compte est passé en premium : packs en plus, quêtes premium et récompenses premium du Disque d'Or.\n\n${intro}\n\n` +
      `${CANCEL_HOW}\nGérer mon abonnement : ${link}`,
    html: layout({
      preheader: trial ? `Ton mois offert commence : aucun prélèvement avant le ${date}.` : `Paiement de ${price} reçu, bienvenue dans Premium.`,
      title: `Bienvenue dans Premium, ${pseudo} !`,
      paragraphs: [
        "Ton compte est passé en premium : packs en plus, quêtes premium et récompenses premium du Disque d&#39;Or.",
        escapeHtml(intro),
      ],
      details: trial
        ? [["Offre", "Musicodex Premium"], ["Mois offert jusqu'au", date], ["Ensuite", `${price} / mois`]]
        : [["Offre", "Musicodex Premium"], ["Montant payé", price], ["Prochain renouvellement", date]],
      button: { label: "Gérer mon abonnement", url: link },
      note: CANCEL_HOW,
    }),
  };
}

// Reçu de chaque renouvellement mensuel
export function premiumReceiptEmail({ pseudo, link, amountCents, paidAt, renewsAt }: { pseudo: string; link: string; amountCents: number; paidAt: Date; renewsAt: Date }): EmailContent {
  const amount = formatEuros(amountCents);
  return {
    subject: "Paiement reçu : Musicodex Premium",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Nous avons bien reçu ton paiement de ${amount} le ${formatDate(paidAt)} pour Musicodex Premium.\n` +
      `Prochain renouvellement : ${formatDate(renewsAt)}.\n\n` +
      `${CANCEL_HOW}\nGérer mon abonnement : ${link}`,
    html: layout({
      preheader: `Paiement de ${amount} reçu, merci !`,
      title: "Paiement reçu, merci !",
      paragraphs: [`Bonjour ${escapeHtml(pseudo)},`, "Ton abonnement premium continue pour un mois de plus. Voici le récapitulatif :"],
      details: [["Offre", "Musicodex Premium"], ["Montant", amount], ["Payé le", formatDate(paidAt)], ["Prochain renouvellement", formatDate(renewsAt)]],
      button: { label: "Gérer mon abonnement", url: link },
      note: CANCEL_HOW,
    }),
  };
}

// Rappel avant la fin du mois offert : le premier prélèvement approche
export function trialEndingEmail({ pseudo, link, endsAt, priceCents }: { pseudo: string; link: string; endsAt: Date; priceCents: number }): EmailContent {
  const price = formatEuros(priceCents);
  const date = formatDate(endsAt);
  return {
    subject: `Ton mois offert se termine le ${date}`,
    text:
      `Bonjour ${pseudo},\n\n` +
      `Ton mois offert de Musicodex Premium se termine le ${date}. Ce jour-là, l'abonnement continue à ${price} par mois ` +
      "et le premier paiement sera prélevé.\n\n" +
      `Tu veux continuer ? Tu n'as rien à faire.\nTu ne veux pas payer ? Pense à résilier avant le ${date} depuis ton profil, rubrique « Mon abonnement » : ${link}`,
    html: layout({
      preheader: `Premier prélèvement de ${price} le ${date}, sauf si tu résilies avant.`,
      title: "Ton mois offert se termine bientôt",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        `Ton mois offert se termine le <strong>${date}</strong>. Ce jour-là, l&#39;abonnement continue à ${price} par mois et le premier paiement sera prélevé.`,
        `Tu veux continuer ? Tu n&#39;as rien à faire. Sinon, pense à résilier avant le ${date}.`,
      ],
      details: [["Fin du mois offert", date], ["Ensuite", `${price} / mois`]],
      button: { label: "Gérer mon abonnement", url: link },
      note: "Nous t'envoyons ce rappel pour que le premier paiement ne soit jamais une surprise.",
    }),
  };
}

// Résiliation : effet immédiat (voir les CGV), plus aucun prélèvement
export function premiumCancelledEmail({ pseudo, link }: { pseudo: string; link: string }): EmailContent {
  return {
    subject: "Ton abonnement premium est résilié",
    text:
      `Bonjour ${pseudo},\n\n` +
      "Ton abonnement Musicodex Premium est résilié. Plus aucun prélèvement ne sera fait.\n" +
      "Comme prévu dans les conditions de vente, la résiliation prend effet tout de suite : ton compte est redevenu gratuit. " +
      "Ta collection, tes pièces et tes packs déjà gagnés restent à toi.\n\n" +
      `Tu pourras te réabonner quand tu veux : ${link}\n\n` +
      "Tu n'as pas demandé cette résiliation ? Écris-nous à l'adresse de contact indiquée dans les mentions légales du site.",
    html: layout({
      preheader: "Plus aucun prélèvement : ton compte est redevenu gratuit.",
      title: "Abonnement résilié",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        "Ton abonnement Musicodex Premium est résilié. <strong>Plus aucun prélèvement ne sera fait.</strong>",
        "La résiliation prend effet tout de suite : ton compte est redevenu gratuit. Ta collection, tes pièces et tes packs déjà gagnés restent à toi.",
      ],
      button: { label: "Revenir sur Premium", url: link },
      note: "Tu n'as pas demandé cette résiliation ? Écris-nous à l'adresse de contact des mentions légales du site.",
    }),
  };
}

// Paiement mensuel refusé (carte expirée, plafond...) : le premium est suspendu jusqu'au paiement
export function paymentFailedEmail({ pseudo, link, amountCents }: { pseudo: string; link: string; amountCents: number }): EmailContent {
  const amount = formatEuros(amountCents);
  return {
    subject: "Paiement refusé : ton premium est en pause",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Le paiement de ${amount} pour Musicodex Premium a été refusé par ta banque (carte expirée ou plafond atteint, par exemple).\n` +
      "Ton premium est en pause tant que le paiement n'est pas passé.\n\n" +
      `Mets à jour ton moyen de paiement ici : ${link}\n\n` +
      "Tu ne veux plus de premium ? Tu n'as rien à faire : sans paiement, l'abonnement s'arrête de lui-même.",
    html: layout({
      preheader: `Le paiement de ${amount} n'est pas passé : mets à jour ta carte.`,
      title: "Ton paiement n'est pas passé",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        `Le paiement de <strong>${amount}</strong> pour Musicodex Premium a été refusé par ta banque (carte expirée ou plafond atteint, par exemple). Ton premium est en pause tant que le paiement n&#39;est pas passé.`,
      ],
      button: { label: "Mettre à jour ma carte", url: link },
      note: "Tu ne veux plus de premium ? Tu n'as rien à faire : sans paiement, l'abonnement s'arrête de lui-même.",
    }),
  };
}
