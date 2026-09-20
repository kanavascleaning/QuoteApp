# Android debug testing

The Android wrapper uses Capacitor with app ID `com.clearpane.fieldquotekit`.
The generated Android project lives in `android/`.

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
pnpm --filter @workspace/window-cleaning-quotes run android:sync
cd artifacts/window-cleaning-quotes/android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The APK is created at:

```text
artifacts/window-cleaning-quotes/android/app/build/outputs/apk/debug/app-debug.apk
```

`-r` reinstalls the debug build without removing the app's local data. To
simulate a first install and clear saved prices and quotes, uninstall the app
from the phone first:

```bash
adb uninstall com.clearpane.fieldquotekit
```

You can also open the project in Android Studio and use the **Run** button with
the connected phone selected. The generated debug APK is unsigned and intended
for local testing only.

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
