import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkBasicAuth } from "@/lib/basic-auth";
import { safeCallbackUrl } from "@/lib/callback-url";
import { clientIp, isRateLimited, MINUTE, resetRateLimit } from "@/lib/rate-limit";

const AUTH_PAGES = ["/connexion", "/inscription"];

// /documentation : identifiant et mot de passe demandés par le navigateur (DOC_HTPASSWD dans .env, format .htpasswd).
// 30 essais par adresse IP et par quart d'heure, pour qu'un robot ne puisse pas deviner le mot de passe.
async function documentationGate(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const key = `doc:ip:${clientIp(request.headers)}`;
    if (await isRateLimited(key, 30, 15 * MINUTE)) {
      return new NextResponse("Trop d'essais : réessaie dans un quart d'heure.", { status: 429 });
    }
    if (await checkBasicAuth(authorization, process.env.DOC_HTPASSWD)) {
      await resetRateLimit(key);
      return null;
    }
  }
  return new NextResponse("Identifiant et mot de passe nécessaires.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Documentation Musicodex", charset="UTF-8"' },
  });
}

// Contrôle côté serveur, avant tout rendu (redirection 307) :
// - documentation : identifiant et mot de passe (voir documentationGate) ;
// - pages réservées aux joueurs : sans session, on part vers la connexion (elles restent aussi protégées dans leur code) ;
// - connexion et inscription : déjà connecté, on part vers la page demandée (callbackUrl) ou le profil.
// La session est lue par Auth.js lui-même : il choisit le bon nom de cookie selon le protocole
// d'AUTH_URL (`authjs.session-token` en http, `__Secure-authjs.session-token` en https).
export const proxy = auth(async (request) => {
  const { pathname, search, origin } = request.nextUrl;

  if (pathname === "/documentation" || pathname.startsWith("/documentation/")) {
    return (await documentationGate(request)) ?? NextResponse.next();
  }

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
    "/documentation/:path*",
    "/connexion",
    "/inscription",
    "/packs/:path*",
    "/collection/:path*",
    "/amis/:path*",
    "/echanges/:path*",
    "/marche/:path*",
    "/bourse/:path*",
    "/classement/:path*",
    "/premium/:path*",
    "/pioche/:path*",
    "/quetes/:path*",
    "/profil/:path*",
  ],
};
