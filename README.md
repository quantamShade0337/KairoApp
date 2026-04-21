This is a [Next.js](https://nextjs.org) project for Kyro, a small-app builder and marketplace.

## Backend

Kyro now includes a server-backed local data layer:

- Route Handlers under `app/api/*`
- Cookie-based auth sessions
- File-backed persistence in `data/kyro-db.json`
- Seeded users, projects, apps, dashboard data, publish flow, clone flow, and profile/settings data

Firebase Auth can also be layered on top of that local app data. When Firebase env values are present, signup/signin routes authenticate against Firebase first and then create a Kyro session for the matching local user record.

### Firebase Auth

Add one of these env styles in `.env` or `.env.local`:

```bash
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_APP_ID=...
```

or the equivalent existing keys already used in your file:

```bash
apiKey=...
authDomain=...
projectId=...
appId=...
```

`storageBucket`, `messagingSenderId`, and other Firebase web config values are fine to keep as well, but the server auth flow only requires the API key to talk to Firebase Auth.

### Demo Login

- Email: `alexc@kyro.dev`
- Password: `password123`

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

The local database file is created automatically on first run. It is ignored by git.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
