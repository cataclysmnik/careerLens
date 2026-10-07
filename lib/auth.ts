import NextAuth, { customFetch } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { SKIP_APPROVAL } from "@/lib/demo"
import { initialStatusFor, parseRole } from "@/lib/accountStatus"
import { SIGNUP_ROLE_COOKIE } from "@/lib/signupRole"
import { cookies } from "next/headers"
import { ipv4Fetch } from "@/lib/ipv4Fetch"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      [customFetch]: ipv4Fetch,
    }),
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
          if (!SKIP_APPROVAL) return null
          await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } })
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: "ACTIVE",
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

      // First-time Google sign-in: provision an account with the role picked
      // on the register page (defaults to STUDENT), mirroring /api/register.
      const existing = await prisma.user.findUnique({ where: { email: user.email } })
      if (!existing) {
        const cookieStore = await cookies()
        const role = parseRole(cookieStore.get(SIGNUP_ROLE_COOKIE)?.value)
        cookieStore.delete(SIGNUP_ROLE_COOKIE)
        const status = await initialStatusFor(role)
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            role,
            status,
            ...(role === "STUDENT" && { profile: { create: {} } }),
          }
        })
        if (status === "PENDING") return "/pending-approval"
      } else if (existing.status === "PENDING") {
        // Company/Placement-Cell accounts still awaiting approval.
        if (!SKIP_APPROVAL) return "/pending-approval"
        await prisma.user.update({ where: { id: existing.id }, data: { status: "ACTIVE" } })
      }

      return true
    },
    async jwt({ token, user, trigger }) {
      if (trigger === "update" && token.sub) {
        // Profile edits change the display name; refresh it from the DB
        // rather than trusting client-supplied session data.
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } })
        if (dbUser) token.name = dbUser.name
        return token
      }
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
