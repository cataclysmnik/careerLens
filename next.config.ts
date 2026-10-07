import type { NextConfig } from "next";

// Env files are gitignored (they hold secrets), so a fresh clone has none and
// auth fails with an opaque "server configuration" error. Next loads .env*
// before this file, so warn here with the exact variables that are missing.
const REQUIRED_ENV = [
  { keys: ["DATABASE_URL"], why: "Supabase Postgres connection string (users and profiles live there)" },
  { keys: ["NEXTAUTH_SECRET", "AUTH_SECRET"], why: "signs login sessions; without it every page shows a ClientFetchError" },
];
const OPTIONAL_ENV = [
  { keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], why: "Google sign-in" },
  { keys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"], why: "password-reset emails (links are logged to the console without them)" },
];

const isSet = (key: string) => !!process.env[key]?.trim();
const missingRequired = REQUIRED_ENV.filter((v) => !v.keys.some(isSet));
const missingOptional = OPTIONAL_ENV.filter((v) => !v.keys.every(isSet));

if (missingRequired.length || missingOptional.length) {
  const line = (v: { keys: string[]; why: string }) => `    - ${v.keys.join(" / ")}: ${v.why}`;
  console.warn(
    [
      "",
      "⚠ CareerLens environment is incomplete.",
      ...(missingRequired.length ? ["  Required (the app won't work without these):", ...missingRequired.map(line)] : []),
      ...(missingOptional.length ? ["  Optional:", ...missingOptional.map(line)] : []),
      "  Copy .env.example to .env.local and fill in the values (ask a teammate for them; they aren't in git).",
      "",
    ].join("\n")
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // The MCP endpoint makes next dev write browser logs to .next/dev/logs on
    // every page load. That write was being picked up as a change, rebuilding
    // and reloading the page in an endless loop. Nothing in the app uses it.
    mcpServer: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind runs through PostCSS (postcss.config.mjs). The @tailwindcss/turbopack
  // loader watched the whole project directory, including .next, so every dev
  // log write triggered a rebuild and a full page reload loop.
  serverExternalPackages: ["pdf2json", "mammoth"],
};

export default nextConfig;
