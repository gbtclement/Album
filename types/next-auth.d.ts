// Ce fichier doit être un module (export {}) pour compléter les types de la librairie
// au lieu de les remplacer.
export {};

// Ajoute notre identifiant et notre pseudo à la session et au token
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      pseudo: string;
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
  }
}
