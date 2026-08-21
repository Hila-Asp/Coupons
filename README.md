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

## Android APK (no Play Store, no Android Studio)

Sideload a debug APK with Capacitor 7. The UI stays the same Vite/React SPA inside a WebView. JDK 17 and the Android command-line SDK are required. Android Studio is not.

Set `ANDROID_HOME` to your SDK path (for example `C:\Android\sdk`) and put `platform-tools` and `cmdline-tools` on `PATH`.

Optional: set `VITE_API_BASE` to the deployed Vercel origin (for example `https://your-app.vercel.app`) before building if you want the APK to call `POST /api/voucher-code`. If it is unset, the APK skips the relative `/api` route (it would 404) and uses the existing jina.ai fallback.

```bash
npm install
npm run icons
npm run build:native
npx cap add android   # first time only
npx cap sync
```

After the first `npx cap add android`, add a `SEND` / `text/*` intent-filter on the main activity in `android/app/src/main/AndroidManifest.xml` so SMS share works:

```xml
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/*" />
</intent-filter>
```

Then assemble from the project root (Windows):

```bash
android\gradlew.bat assembleDebug
```

APK path: `android/app/build/outputs/apk/debug/app-debug.apk`

On GitHub: **Actions → Android debug APK → Run workflow** (also runs on push to `main`/`master`). Download the `app-debug.apk` artifact.

On Windows, from the repo root: `.\scripts\build-apk.ps1` — it runs icons, the native build, `cap add` if needed, the share intent, sync, and Gradle, then copies `dist-apk/VoucherManager-debug.apk`. If this path has Hebrew or spaces, Gradle is staged at `C:\Users\Hila\voucher-apk-build` and the APK is copied back (the repo is not deleted).

Copy `dist-apk/VoucherManager.apk` (release-signed) to the phone over **USB**, not Chrome/Drive/Gmail if Play Protect blocked the download. Enable unknown sources / install from files, then open the APK.

Play Protect often blocks the first sideload of an app that is not on Google Play, especially a debug build or an app that reads SMS. This is expected for a personal APK.

On the phone:

1. Play Store → profile → **Play Protect** → gear → turn **Scan apps with Play Protect** off.
2. On Samsung: Settings → Security and privacy → **Auto blocker** → off (if present).
3. Install the APK.
4. Turn Play Protect back on.

If the warning still appears, open **More details** and choose **Install anyway** when Android offers it.

`npm run cap:sync` runs `build:native` (PWA plugin skipped) then `npx cap sync`.

Share-intent plugin: `@capgo/capacitor-share-target` v7. `@capacitor-community/receive-share-intent` and `@capgo/capacitor-receive-sharing-intent` are not on npm. This package is Capacitor 7-compatible and still receives shared text via `shareReceived`.
