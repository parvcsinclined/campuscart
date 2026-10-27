import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { loginSchema } from "./validation/auth";
import { rateLimit, clientIp } from "./rate-limit";
import { AppError } from "./errors";

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

// A real hash of a random string, so unknown emails take as long as wrong passwords.
const DUMMY_HASH = "$2b$10$KOabTO4ea.xhrIzT.qPSh.amDj0tBNoceWnST4NzGpJAJQWLY5syy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        try {
          await rateLimit(`login:ip:${clientIp(request)}`, 20, 15 * 60);
          await rateLimit(`login:email:${email}`, 8, 15 * 60);
        } catch (err) {
          if (err instanceof AppError && err.code === "RATE_LIMITED") throw new RateLimitedSignin();
          throw err;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: { id: true, name: true, passwordHash: true },
        });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !ok) return null;
        return { id: user.id, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
