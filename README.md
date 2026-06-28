# Unfollow Snitch

Find Instagram accounts you follow that do not follow you back.

This is a small Next.js Pages Router app with Tailwind CSS. Upload an Instagram
data export zip, and the app compares:

- `connections/followers_and_following/following.json`
- `connections/followers_and_following/followers_*.json`

The result is a searchable list of accounts you follow that are not in your
followers list.

## Privacy

Uploads are parsed per request and are not stored in a database. The local seed
Instagram export is ignored by git with `instagram-*.zip`; tests use only small
anonymized fixtures in `fixtures/`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then upload your Instagram
export zip.

## Getting Your Instagram Export

1. Open Instagram's Accounts Center.
2. Go to your information and permissions.
3. Choose Download your information.
4. Select followers and following data.
5. Download the zip and upload it in this app.

## Scripts

```bash
npm run dev       # start local development server
npm run build     # build production app
npm run start     # start production server
npm test          # run unit tests
npm run typecheck # run TypeScript checks
```