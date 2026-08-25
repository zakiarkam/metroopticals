import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { verifyUser } from "@/features/auth/services/auth-service";
import { logger, serializeError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Throttle brute-force attempts per account.
        rateLimit(
          `login:${credentials.email.toLowerCase()}`,
          10,
          15 * 60 * 1000
        );

        try {
          const user = await verifyUser(
            credentials.email,
            credentials.password
          );

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }

          return null;
        } catch (error) {
          logger.error("Authorization error", serializeError(error));
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/log-in",
    error: "/log-in",
    signOut: "/log-in",
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      // Initial log in
      if (user) {
        const userId =
          typeof user.id === "number" ? user.id : Number(user.id ?? NaN);
        token.id = Number.isFinite(userId) ? userId : token.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image ?? token.image;
        token.role = user.role;
        token.createdAt = user.createdAt;
        token.customerType = (user as any).customerType ?? token.customerType;
        token.phone = user.phone ?? token.phone;
        token.address = user.address ?? token.address;
        token.city = user.city ?? token.city;
        token.country = user.country ?? token.country;
        token.postalCode = user.postalCode ?? token.postalCode;

        // Fetch extra fields not returned by authorize (e.g. customerType)
        if (!token.customerType && Number.isFinite(userId)) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { customerType: true },
            });
            if (dbUser) token.customerType = dbUser.customerType;
          } catch {}
        }
      }

      // Handle session update
      if (trigger === "update" && session?.user) {
        const updatedUser = session.user as any;
        token.id = updatedUser.id ?? token.id;
        token.email = updatedUser.email ?? token.email;
        token.name = updatedUser.name ?? token.name;
        token.image = updatedUser.image ?? token.image;
        token.role = updatedUser.role ?? token.role;
        token.customerType = updatedUser.customerType ?? token.customerType;
        token.phone = updatedUser.phone ?? token.phone;
        token.address = updatedUser.address ?? token.address;
        token.city = updatedUser.city ?? token.city;
        token.country = updatedUser.country ?? token.country;
        token.postalCode = updatedUser.postalCode ?? token.postalCode;
      }

      if (trigger === "update" && session?.user?.provider) {
        token.provider = session.user.provider;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id =
          typeof token.id === "number" ? token.id : Number(token.id ?? NaN);
        session.user.email = token.email as string;
        session.user.name = token.name as string;

        // Ensure role is one of the allowed values before assigning
        const role = token.role as string | undefined;
        if (role === "ADMIN" || role === "CUSTOMER" || role === "SUPER_ADMIN") {
          session.user.role = role;
        } else {
          session.user.role = "CUSTOMER";
        }

        session.user.createdAt = token.createdAt as string;
        session.user.customerType = (token.customerType as string) ?? null;
        session.user.phone = token.phone ?? null;
        session.user.address = token.address ?? null;
        session.user.city = token.city ?? null;
        session.user.country = token.country ?? null;
        session.user.postalCode = token.postalCode ?? null;
        session.user.provider = token.provider as string | undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after log in based on role
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user }) {},
    async signOut() {},
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
