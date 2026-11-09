# Install and test Window Cleaning Quotes

## Hosted app

The hosted app is published from the same repository source as the Android APK:

**https://kanavascleaning.github.io/QuoteApp/**

The first GitHub Pages deployment requires a repository owner to open
**Settings → Pages → Build and deployment** and set **Source** to **GitHub
Actions**. The link becomes available after the `Deploy Window Quotes PWA`
workflow completes. GitHub Pages availability depends on the repository's
visibility and GitHub plan.

## Install on iPhone or iPad

1. Open the hosted app link above in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. If shown, turn on **Open as Web App**, then tap **Add**.
4. Open **Window Quotes** from the Home Screen.

For offline use, open the app once while online and let the first load finish
before closing it.

## Install on Android

1. Open the hosted app link above in **Chrome**.
2. Open Chrome's menu and choose **Install app** or **Add to Home screen**.
3. Confirm the install, then open **Window Quotes** from the Home screen or app
   list.

The Android APK is a separate testing build. Its GitHub Actions workflow uploads
`window-quote-debug.apk` for 14 days; it is not a Play Store release. Installing
an APK is optional and requires allowing installation from the app used to open
the downloaded file.

## Saving, moving, and updating data

- Quotes, price lists, and contact details are saved in local storage on the
  device/browser. There are no user accounts, cloud storage, or automatic
  synchronization.
- Storage is associated with the app's origin and browser storage partition.
  Safari and an iPhone Home Screen app may use separate storage; Android Chrome
  tabs and its installed PWA may share storage. The Android APK uses its own
  WebView storage. A preview URL and the hosted URL are different origins.
  Behavior can vary by browser and operating-system version, so do not assume
  one installation can see another's data.
- The PWA checks for updates on launch, when it returns to the foreground, and
  periodically while open. When an update is ready, choose **Update now**; the
  app reloads with the new build. Saved local data is not cleared by an update.
  If offline, the installed version continues to work until an update can be
  downloaded.
- Settings already includes **Export a backup** and **Restore from a backup
  file** for moving data. Restore replaces the current saved data on that
  installation; review the confirmation before proceeding. Backup files may
  contain customer addresses.
- An APK update must be downloaded and installed over the existing APK. Do not
  uninstall first if you want to keep that APK's local data.

## Device checklist

Run these checks separately on iPhone Home Screen mode and Android Chrome. Test
the APK separately if it is used; its storage is not the Chrome PWA's storage.

1. Install/open the app online and visit Settings.
2. Create two named price lists with different prices. Close and reopen the app;
   confirm both lists and their prices remain.
3. Create and save a quote using one list. Close and reopen the app; confirm
   that quote is still listed and opens with its saved prices.
4. Confirm the version shown in Settings matches the build expected for that
   release. Publish a later build, return online, and verify the update prompt
   appears. Update and confirm the price lists and quote remain.
5. After a successful online load, turn on Airplane Mode or disable networking.
   Launch the app again, open Settings and the saved quote, and confirm the
   cached app shell and local data are available. Check that remote fonts may
   fall back to the device font while offline.
6. Restore networking and confirm the app reconnects and can receive a later
   web update without deleting saved data.

### Reported real-device results — November 9, 2026

- **iPhone Home Screen:** The user reported that price lists and a quote remained
  after closing and reopening the app.
- **Android Chrome installed PWA:** The user reported that creating price lists
  and a quote, closing and reopening, launching offline, and applying a web
  update all worked; saved data remained available.
- **Storage separation:** The user observed that data appeared separate among
  browser tabs, installed PWAs, and the Android APK. Exact pair-by-pair results
  and device, browser, and OS versions were not recorded. Treat this as an
  observation from one test setup, not a guarantee for every device.

For manual APK build/install steps and Android device setup, see
[ANDROID_TESTING.md](./ANDROID_TESTING.md).
