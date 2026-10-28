---
name: Android build toolchain
description: Native requirements for building the Capacitor Android wrapper.
---

The generated Capacitor Android project targets Android SDK 36 and Java 21.
The Replit workspace can build and sync the web bundle but does not include
Java or the Android SDK, so it cannot compile the APK locally. Use the
repository's GitHub Actions build for a cloud APK, or build on a computer with
Android Studio, SDK Platform 36, Platform-Tools, and JDK 21.

`android-actions/setup-android@v3` defaults to installing the obsolete SDK
package `tools`; v4 uses `platform-tools`. Keep the `packages` input explicit
and install the required platform/build-tools separately.

**Why:** Capacitor's Gradle build fails before compilation when no Java runtime
is present, while the web build and Capacitor sync can still pass. The v3
Android setup action's removed `tools` default failed before the project's SDK
packages were installed.

**How to apply:** Use the project Android testing guide for GitHub Actions,
local setup, `android:sync`, `assembleDebug`, APK installation, and device
testing steps.