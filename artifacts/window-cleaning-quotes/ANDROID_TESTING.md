# Android debug testing

The Android wrapper uses Capacitor with app ID `com.clearpane.fieldquotekit`.
The generated Android project lives in `android/`.

For iPhone Home Screen installation, Android Chrome PWA installation, storage
limitations, update behavior, offline checks, and the hosted app link, see
[INSTALLATION_AND_TESTING.md](./INSTALLATION_AND_TESTING.md).

## One-time setup on your computer

Install:

- Android Studio with the Android SDK Platform 36 and Android SDK Build-Tools
- A Java 21 JDK
- Android SDK Platform-Tools

Open `android/` in Android Studio once. Let it create `local.properties` and
finish the Gradle sync. In Android Studio, use **Tools → SDK Manager** to
confirm that Platform 36 and Platform-Tools are installed.

On your Android phone:

1. Open **Settings → About phone**.
2. Tap **Build number** seven times to enable Developer options.
3. In **Developer options**, enable **USB debugging**.
4. Connect the phone with a USB cable and accept the computer authorization
   prompt.

Confirm the phone is visible:

```bash
adb devices
```

The device should appear as `device`, not `unauthorized`.

## Build and install a debug APK

Run these commands from the repository root after changing the web app:

```bash
pnpm --filter @workspace/window-cleaning-quotes run android:build
adb install -r artifacts/window-cleaning-quotes/android/app/build/outputs/apk/debug/app-debug.apk
```

The APK is created at:

```text
artifacts/window-cleaning-quotes/android/app/build/outputs/apk/debug/app-debug.apk
```

The equivalent explicit web-only build is
`pnpm --filter @workspace/window-cleaning-quotes run web:build`. Both builds use
the same app sources; Android uses the root base path while hosted builds set
their base path through `BASE_PATH`.

`-r` reinstalls the debug build without removing the app's local data. To
simulate a first install and clear saved prices and quotes, uninstall the app
from the phone first:

```bash
adb uninstall com.clearpane.fieldquotekit
```

You can also open the project in Android Studio and use the **Run** button with
the connected phone selected. The debug APK is signed with Android's local
debug key and is intended for testing only.

## Build through GitHub Actions

The repository includes `.github/workflows/build-apk.yml`. It builds the web
app, syncs Capacitor, compiles a debug APK with Java 21 and Android SDK 36, and
uploads `window-quote-debug.apk` as a downloadable workflow artifact. The same
push to `main` also runs `.github/workflows/deploy-pwa.yml` to publish the hosted
app.

1. Push the project, including the workflow file, to a GitHub repository. If
   this workspace's repository is not connected to GitHub yet, create an empty
   GitHub repository, then add it as a remote and push the current `main`
   branch:

   ```bash
   git remote add github https://github.com/<OWNER>/<REPOSITORY>.git
   git push -u github main
   ```

2. In that repository on GitHub, open **Settings → Pages** and set **Build and
   deployment → Source** to **GitHub Actions**. This is a one-time owner action.
   Then open **Actions** and select **Build Android debug APK** or **Deploy
   Window Quotes PWA**. Pushes to `main` that change shared app/build files run
   both workflows automatically. For later manual builds, use **Run workflow**.
3. Open the completed run, scroll to **Artifacts**, and download
   **window-quote-debug**. Extract the downloaded ZIP to get
   `window-quote-debug.apk`.
4. Transfer the APK to your phone (USB, a trusted cloud drive, or a private
   message to yourself), then open it on the phone.
5. If Android asks, allow your file manager or browser to **Install unknown
   apps**, return to the APK, and tap **Install**. You can turn that permission
   off again after installation.

The workflow artifact is kept for 14 days. This is a debug APK for testing, not
a Play Store release. Android signs debug APKs with a debug key; it is not a
production release signature.

## What differs from the browser version

- The APK works offline for quotes and prices because the app and its data are
  local. Google Fonts may not load without internet, so the system falls back
  to its local sans-serif font.
- APK data is stored privately on that phone and is not shared with the browser
  version. Installing an update over the existing app keeps its data;
  uninstalling the app clears its local data.
- The installed app does not need the Replit preview or API server to create,
  save, or review quotes.

## Repeatable development cycle

After web code changes:

```bash
pnpm --filter @workspace/window-cleaning-quotes run android:sync
cd artifacts/window-cleaning-quotes/android
./gradlew installDebug
```

The `android:sync` script rebuilds the Vite app, copies the latest assets into
the native project, and refreshes Capacitor's Android files.

## Android-specific test checklist

1. **Fresh install:** uninstall, reinstall, launch, and confirm the Home screen
   loads without a network connection.
2. **No prices state:** set every price to zero, save, and confirm Settings
   shows “No prices set yet”.
3. **Negative price validation:** enter a negative value and tap Save prices.
   Confirm the error appears and the negative value is not saved.
4. **Numeric keyboard:** focus each price input and confirm the decimal keypad
   opens. Focus the address field and confirm the normal text keyboard opens.
5. **Quantity safety:** tap minus repeatedly at zero and confirm quantities
   never become negative.
6. **Keyboard and scrolling:** focus fields near the bottom of the page and
   confirm the focused field remains visible above the keyboard. Confirm the
   sticky Save button does not cover the keyboard in the short viewport.
7. **Safe areas:** test on a phone with gesture navigation and confirm the
   bottom navigation and Save button do not sit under the system gesture area.
8. **Saved quote flow:** create, review, edit, resave, and delete a quote.
   Confirm editing keeps one quote and Settings changes do not alter a saved
   quote's stored prices.
9. **Back navigation:** use the Android system Back button from review and edit
   screens and confirm it returns to the previous screen rather than exiting
   unexpectedly.
