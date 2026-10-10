import type { ReactNode } from "react";

// Pages connexion et inscription : pas de barre de jeu, le joueur n'est pas encore connecté
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
