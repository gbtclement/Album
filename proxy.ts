import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Contrôle côté serveur des pages réservées aux joueurs : sans session, redirection immédiate (307)
// vers la connexion, avant tout rendu. Les pages restent aussi protégées dans leur propre code.
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (!token) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

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
