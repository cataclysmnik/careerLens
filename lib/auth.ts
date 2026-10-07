import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          return null
        }

        // Pending Company/Placement-Cell accounts cannot sign in until approved.
        if (user.status === "PENDING") {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true
      }

      if (!user.email) {
        return false
      }

      // First-time Google sign-in: provision a STUDENT account, mirroring
      // what /api/register does for the credentials flow.
      const existing = await prisma.user.findUnique({ where: { email: user.email } })
      if (!existing) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: "STUDENT",
            status: "ACTIVE",
            profile: { create: {} },
          }
        })
      } else if (existing.status === "PENDING") {
        // Company/Placement-Cell accounts still awaiting approval.
        return false
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.status = user.status
      } else if (token.email && (!token.role || !token.status)) {
        // Google sign-in doesn't go through `authorize`, so backfill role/status
        // from the DB on first JWT issuance for that session.
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
        if (dbUser) {
          token.role = dbUser.role
          token.status = dbUser.status
          token.sub = dbUser.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role as typeof session.user.role
        session.user.status = token.status as typeof session.user.status
      }
      return session
    }
  }
})
