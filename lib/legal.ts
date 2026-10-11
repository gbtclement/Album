// Informations légales et règles de conservation des données (lot R1).
// Les coordonnées de l'éditeur et de l'hébergeur viennent de .env, pour ne pas les écrire dans le code :
//   LEGAL_PUBLISHER     : nom de l'éditeur du site (personne ou société)
//   LEGAL_CONTACT_EMAIL : adresse où écrire pour toute question sur le site et les données
//   LEGAL_HOST          : nom, adresse et téléphone de l'hébergeur
//   LEGAL_SELLER        : adresse et numéro SIRET du vendeur de l'abonnement premium (CGV)
//   LEGAL_MEDIATOR      : nom et site du médiateur de la consommation (CGV)

// Date de la version en vigueur des CGU et de la politique de confidentialité
export const LEGAL_UPDATED_AT = "11 octobre 2026";

// Âge minimum pour s'inscrire sans l'accord d'un parent (majorité numérique en France)
export const MIN_AGE = 15;

// Un compte sans visite pendant ce délai est supprimé, après un e-mail d'avertissement
export const INACTIVE_YEARS = 3;
export const INACTIVITY_NOTICE_DAYS = 30;

const MISSING = "[à compléter avant la mise en ligne]";

export function legalInfo() {
  return {
    publisher: process.env.LEGAL_PUBLISHER || MISSING,
    contactEmail: process.env.LEGAL_CONTACT_EMAIL || MISSING,
    host: process.env.LEGAL_HOST || MISSING,
    seller: process.env.LEGAL_SELLER || MISSING,
    mediator: process.env.LEGAL_MEDIATOR || MISSING,
  };
}
