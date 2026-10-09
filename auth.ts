import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createGoogleUser, findUserByEmail } from "@/lib/users";

// Google n'apparaît sur la page de connexion que si les clés sont renseignées dans .env
const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

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
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        const user = await findUserByEmail(email);
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        return valid ? { id: user.id, email: user.email, name: user.pseudo } : null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      // Premier passage avec Google : on crée le compte en base
      const existing = await findUserByEmail(user.email);
      if (!existing) {
        await createGoogleUser(user.email, user.name ?? user.email.split("@")[0]);
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
        }
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
