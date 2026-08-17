# Voucher Manager

Offline-first PWA for Israeli gift vouchers. Data stays in IndexedDB on the phone. One Vercel function exists only to read a 20-digit Pluxee code from `myconsumers.pluxee.co.il`.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Tests and checks

```bash
npm test
npx oxlint
npm run build
```

`npm run build` type-checks and produces the production bundle in `dist/`.

## Deploy

This app is meant for Vercel. From the project root, after you are logged in:

```bash
npx vercel login
npx vercel --prod
```

`vercel login` is interactive (browser or email). This repo does not store Vercel credentials. After the first link, later deploys can use the same command.

`vercel.json` already rewrites unknown paths to `index.html` so `/share` and `/company/:id` work when installed.

## Install on a Galaxy S25

1. Open the production URL in Samsung Internet or Chrome.
2. Samsung Internet: menu → **Add page to** → **Home screen**.
   Chrome: menu → **Install app** / **Add to Home screen**.
3. Open the app from the home-screen icon (standalone), not from the browser tab.

Changing `share_target` in the web manifest does **not** update an already-installed PWA. Uninstall it from the home screen, then install again.

## Add it to the Android share sheet

1. Install the PWA as above (reinstall if you already had an older build).
2. In Samsung Messages, open a voucher SMS.
3. Long-press the message → **Share**.
4. Choose **Vouchers** / **Voucher Manager**.
5. Review the prefilled import screen and save. Nothing is written until you confirm.

If the app does not appear in the share sheet, uninstall it, install it again from the same origin, and retry. Android caches share targets at install time.
