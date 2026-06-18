import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { Adapter } from "next-auth/adapters";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async session({ session, user }) {
      // Expose the user id on the session so API routes can scope queries.
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

/** Returns the authenticated user's id, or null if not signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
