import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

// Police d'affichage réservée aux pages d'authentification
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={fraunces.variable}>{children}</div>;
}
