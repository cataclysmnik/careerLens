This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Setup on a new machine

Env files are gitignored because they hold secrets (database password, OAuth
secret, session secret, email app password). A fresh clone has none, and auth
fails with `ClientFetchError: There was a problem with the server configuration`.

1. Copy `.env.example` to `.env.local` and fill in the values. Get them from a
   teammate over a private channel, never through git. `npm run dev` lists any
   that are still missing.
2. Install dependencies and generate the Prisma client:
   ```bash
   npm install
   npx prisma generate
   ```
3. If the app runs anywhere other than `http://localhost:3000`, set `NEXTAUTH_URL`
   to that address and add `<address>/api/auth/callback/google` to the OAuth
   client's authorized redirect URIs in Google Cloud Console.
4. The database is hosted on Supabase, so there's nothing to run locally. Some
   college/office Wi-Fi blocks Postgres ports (5432/6543); if you see
   "Can't reach database server", switch networks.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
