import bcrypt from "bcryptjs";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { clientIp, isRateLimited, MINUTE, resetRateLimit } from "@/lib/rate-limit";
import { claimAccountWithGoogle, createGoogleUser, findUserByEmail, findUserById } from "@/lib/users";

// Google n'apparaît sur la page de connexion que si les clés sont renseignées dans .env
const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// Code renvoyé quand un joueur (ou un robot) essaie trop de mots de passe
export const TOO_MANY_ATTEMPTS = "trop_de_tentatives";
class TooManyAttempts extends CredentialsSignin {
  code = TOO_MANY_ATTEMPTS;
}

// Toutes les minutes, on revérifie en base que la session est toujours valable
const SESSION_CHECK_MS = 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    ...(googleEnabled ? [Google] : []),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        // Limite par compte (deviner le mot de passe d'un joueur) et par adresse IP (essayer beaucoup de comptes).
        // Elle s'applique ici, et pas seulement dans le formulaire : /api/auth/callback/credentials passe aussi par là.
        const ip = clientIp(request.headers);
        const [emailLimited, ipLimited] = await Promise.all([
          isRateLimited(`login:email:${email}`, 10, 15 * MINUTE),
          isRateLimited(`login:ip:${ip}`, 50, 15 * MINUTE),
        ]);
        if (emailLimited || ipLimited) throw new TooManyAttempts();

        const user = await findUserByEmail(email);
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        await resetRateLimit(`login:email:${email}`);
        return { id: user.id, email: user.email, name: user.pseudo };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      // On n'accepte que les adresses que Google a lui-même vérifiées
      if (!user.email || profile?.email_verified !== true) return false;

      const existing = await findUserByEmail(user.email);
      if (!existing) {
        // Premier passage avec Google : on crée le compte en base
        await createGoogleUser(user.email, user.name ?? user.email.split("@")[0]);
      } else if (!existing.email_verified_at) {
        // Compte créé avec un mot de passe mais adresse jamais vérifiée : le titulaire de l'adresse le récupère
        await claimAccountWithGoogle(existing.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      // À la connexion, on récupère l'identifiant et le pseudo de notre base
      if (user?.email) {
        const dbUser = await findUserByEmail(user.email);
        if (dbUser) {
          token.uid = dbUser.id;
          token.pseudo = dbUser.pseudo;
          token.sv = dbUser.session_version;
          token.checkedAt = Date.now();
        }
        return token;
      }

      // Ensuite, régulièrement : compte supprimé ou sessions révoquées (session_version a changé) => déconnexion
      if (token.uid && Date.now() - Number(token.checkedAt ?? 0) > SESSION_CHECK_MS) {
        const dbUser = await findUserById(String(token.uid));
        if (!dbUser || dbUser.session_version !== Number(token.sv ?? 0)) return null;
        token.pseudo = dbUser.pseudo;
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      const user = {
        ...session.user,
        id: String(token.uid ?? ""),
        pseudo: String(token.pseudo ?? ""),
      };
      return { ...session, user };
    },
  },
});
