// Ce fichier doit être un module (export {}) pour compléter les types de la librairie
// au lieu de les remplacer.
export {};

// Ajoute notre identifiant et notre pseudo à la session et au token
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      pseudo: string;
      // « admin » seulement si users.role vaut admin en base (revérifié chaque minute, et en base pour chaque page admin)
      role: "joueur" | "admin";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    pseudo?: string;
    role?: "joueur" | "admin";
    // Version des sessions du joueur au moment de la connexion (voir users.session_version)
    sv?: number;
    // Date (ms) de la dernière vérification en base
    checkedAt?: number;
  }
}
