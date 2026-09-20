---
name: Android build toolchain
description: Native requirements for building the Capacitor Android wrapper.
---

The generated Capacitor Android project targets Android SDK 36 and Java 21.
The Replit workspace can generate and sync the Android project, but it does
not include Java or the Android SDK, so debug APK compilation must run on a
developer computer with Android Studio, SDK Platform 36, Platform-Tools, and
JDK 21.

**Why:** Capacitor's Gradle build fails before compilation when no Java runtime
is present, while the web build and Capacitor doctor checks can still pass.

**How to apply:** Use the project Android testing guide for local setup,
`android:sync`, `assembleDebug`, and device installation steps.