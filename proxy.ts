import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { safeCallbackUrl } from "@/lib/callback-url";

const AUTH_PAGES = ["/connexion", "/inscription"];

// Contrôle côté serveur, avant tout rendu (redirection 307) :
// - pages réservées aux joueurs : sans session, on part vers la connexion (elles restent aussi protégées dans leur code) ;
// - connexion et inscription : déjà connecté, on part vers la page demandée (callbackUrl) ou le profil.
// La session est lue par Auth.js lui-même : il choisit le bon nom de cookie selon le protocole
// d'AUTH_URL (`authjs.session-token` en http, `__Secure-authjs.session-token` en https).
export const proxy = auth((request) => {
  const { pathname, search, origin } = request.nextUrl;

  if (AUTH_PAGES.includes(pathname)) {
    if (!request.auth) return NextResponse.next();
    const target = safeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"));
    return NextResponse.redirect(new URL(target, origin));
  }

  if (!request.auth) {
    const url = new URL("/connexion", origin);
    // Chemin complet, paramètres compris (ex. /echanges/nouveau?avec=...), pour y revenir après la connexion
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/connexion",
    "/inscription",
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
