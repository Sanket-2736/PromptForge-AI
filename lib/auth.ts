import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent select_account",
        },
      },
    }),

    Credentials({
      id: "credentials",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const code = credentials?.code as string | undefined;

        if (!email || !code) return null;

        const now = new Date();

        const otp = await db.otpCode.findFirst({
          where: {
            email,
            code,
            expiresAt: { gt: now },
          },
        });

        if (!otp) return null;

        await db.otpCode.update({
          where: { id: otp.id },
          data: { usedAt: now },
        });

        let user = await db.user.findUnique({ where: { email } });

        if (!user) {
          // New user — create with 10 welcome credits
          user = await db.user.create({
            data: {
              email,
              emailVerified: now,
              credits: 15,
            },
          });
          // Log the welcome grant
          await db.creditLog.create({
            data: {
              userId: user.id,
              type: "GRANT",
              amount: 15,
              reason: "Welcome credits",
            },
          });
        } else if (!user.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: now },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  secret: process.env.AUTH_SECRET,

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        const existing = await db.creditLog.findFirst({
          where: {
            userId: user.id,
            reason: "Welcome credits",
          },
        });

        if (!existing) {
          await db.$transaction([
            db.user.update({
              where: { id: user.id },
              data: { credits: 15 },
            }),
            db.creditLog.create({
              data: {
                userId: user.id,
                type: "GRANT",
                amount: 15,
                reason: "Welcome credits",
              },
            }),
          ]);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as typeof session.user & { id: string }).id =
          token.id as string;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Fires once for any new user — Google OAuth, or any other provider
      // (OTP new users are handled separately in authorize, so skip if credits already set)
      if (!user.id) return;
      const alreadyGranted = await db.creditLog.findFirst({
        where: {
          userId: user.id,
          reason: "Welcome credits",
        },
      });

      if (alreadyGranted) return;

      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { credits: 15 },
        }),
        db.creditLog.create({
          data: {
            userId: user.id,
            type: "GRANT",
            amount: 15,
            reason: "Welcome credits",
          },
        }),
      ]);
    },
  },
});

export const getServerSession = auth;