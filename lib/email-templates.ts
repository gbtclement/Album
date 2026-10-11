// Modèles des e-mails envoyés par le site : vérification de l'adresse et mot de passe oublié.
// Chaque modèle donne un sujet, une version texte (lue par les messageries simples et les filtres anti-spam)
// et une version HTML aux couleurs du jeu. Le HTML d'e-mail suit des règles à part : tableaux pour la mise
// en page, styles écrits sur chaque balise, pas de police web ni d'image obligatoire.
// Aperçu en développement : /apercu-emails/verification et /apercu-emails/mot-de-passe.

export type EmailContent = { subject: string; text: string; html: string };

const COLORS = { night: "#15122a", card: "#2a2550", line: "#3a3466", ink: "#efebfb", muted: "#9a94c2", gold: "#f4b740", goldText: "#2b1d02" };
const FONT = "'Trebuchet MS', 'Segoe UI', Arial, sans-serif";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Cadre commun : logo, carte, bouton doré, lien de secours en clair, pied de page
function layout(options: { preheader: string; title: string; paragraphs: string[]; button: { label: string; url: string }; note: string }) {
  const url = escapeHtml(options.button.url);
  const paragraphs = options.paragraphs
    .map((text) => `<p style="margin:0 0 14px;font:16px/1.55 ${FONT};color:${COLORS.ink};">${text}</p>`)
    .join("");
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
        <span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:${COLORS.gold};vertical-align:middle;text-align:center;line-height:34px;font:bold 16px ${FONT};color:${COLORS.goldText};">&#9835;</span>
        <span style="font:bold 24px ${FONT};color:${COLORS.ink};vertical-align:middle;padding-left:8px;">Album</span>
      </td></tr>
      <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:18px;padding:28px 24px;">
        <h1 style="margin:0 0 16px;font:bold 24px/1.25 ${FONT};color:${COLORS.ink};">${escapeHtml(options.title)}</h1>
        ${paragraphs}
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
      `Bienvenue sur Album, ${pseudo} !\n\n` +
      `Pour confirmer ton adresse e-mail, ouvre ce lien (valable ${hours} heures) :\n${link}\n\n` +
      "Ton compte fonctionne déjà : cette confirmation protège ton compte et te permettra de récupérer ton mot de passe.\n\n" +
      "Si tu n'as pas créé de compte sur Album, ignore simplement ce message.",
    html: layout({
      preheader: "Un clic pour confirmer ton adresse et protéger ton compte.",
      title: `Bienvenue, ${pseudo} !`,
      paragraphs: [
        `Ton compte <strong>${name}</strong> est prêt et tes premiers packs t&#39;attendent.`,
        `Confirme ton adresse e-mail pour protéger ton compte : elle te permettra de récupérer ton mot de passe si tu l&#39;oublies. Le lien est valable ${hours} heures.`,
      ],
      button: { label: "Confirmer mon adresse", url: link },
      note: "Tu n'as pas créé de compte sur Album ? Ignore ce message, aucun compte ne sera confirmé.",
    }),
  };
}

// Compte sans visite depuis longtemps : dernier avertissement avant la suppression (voir lib/account.ts)
export function inactivityEmail({ pseudo, link, days, years }: { pseudo: string; link: string; days: number; years: number }): EmailContent {
  return {
    subject: "Ton compte Album va être supprimé",
    text:
      `Bonjour ${pseudo},\n\n` +
      `Tu ne t'es pas connecté à Album depuis près de ${years} ans. Pour ne pas garder tes données sans raison, ` +
      `ton compte et ta collection seront supprimés dans ${days} jours.\n\n` +
      `Pour garder ton compte, il suffit de te connecter avant cette date :\n${link}\n\n` +
      "Si tu ne veux plus jouer, tu n'as rien à faire.",
    html: layout({
      preheader: `Connecte-toi dans les ${days} jours pour garder ta collection.`,
      title: "Tu nous manques !",
      paragraphs: [
        `Bonjour ${escapeHtml(pseudo)},`,
        `Tu ne t&#39;es pas connecté à Album depuis près de ${years} ans. Pour ne pas garder tes données sans raison, ton compte et ta collection seront supprimés dans <strong>${days} jours</strong>.`,
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
      `Tu as demandé à changer le mot de passe de ton compte Album. Ouvre ce lien pour en choisir un nouveau (valable ${minutes} minutes) :\n${link}\n\n` +
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
