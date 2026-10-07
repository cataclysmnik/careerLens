import { DefaultSession } from "next-auth"
import { Role, AccountStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      status: AccountStatus
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
    status: AccountStatus
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role
    status: AccountStatus
  }
}
