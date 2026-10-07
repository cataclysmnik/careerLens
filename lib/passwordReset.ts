import crypto from "node:crypto"

export const RESET_TOKEN_TTL_MINUTES = 30
export const MIN_PASSWORD_LENGTH = 8

// Only the SHA-256 hash is stored, so a leaked database row can't be used to
// reset a password. The raw token only ever exists in the emailed link.
export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function generateResetToken() {
  const token = crypto.randomBytes(32).toString("base64url")
  return { token, tokenHash: hashResetToken(token) }
}
