import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Contrôle côté serveur des pages réservées aux joueurs : sans session, redirection immédiate (307)
// vers la connexion, avant tout rendu. Les pages restent aussi protégées dans leur propre code.
// La session est lue par Auth.js lui-même : il choisit le bon nom de cookie selon le protocole
// d'AUTH_URL (`authjs.session-token` en http, `__Secure-authjs.session-token` en https).
export const proxy = auth((request) => {
  if (!request.auth) {
    const url = new URL("/connexion", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/packs/:path*",
    "/collection/:path*",
    "/amis/:path*",
    "/echanges/:path*",
    "/marche/:path*",
    "/bourse/:path*",
    "/classement/:path*",
    "/quetes/:path*",
    "/profil/:path*",
  ],
};
