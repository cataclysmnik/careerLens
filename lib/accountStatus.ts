import type { AccountStatus, Role } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import { SKIP_APPROVAL } from "@/lib/demo"

export const VALID_ROLES: Role[] = ["STUDENT", "PLACEMENT_CELL", "COMPANY"]

export function parseRole(value: unknown): Role {
  return VALID_ROLES.includes(value as Role) ? (value as Role) : "STUDENT"
}

// Company / Placement-Cell accounts start PENDING until an existing active
// Placement-Cell user approves them -- except the very first Placement-Cell
// account ever created, which bootstraps the chain.
export async function initialStatusFor(role: Role): Promise<AccountStatus> {
  if (role === "STUDENT" || SKIP_APPROVAL) return "ACTIVE"
  if (role === "PLACEMENT_CELL") {
    const activePlacementCellCount = await prisma.user.count({
      where: { role: "PLACEMENT_CELL", status: "ACTIVE" },
    })
    if (activePlacementCellCount === 0) return "ACTIVE"
  }
  return "PENDING"
}
