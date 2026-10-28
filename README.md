# Tabsy Mobile

Native Android-first mobile application for **Tabsy** (Expense Manager) built with **React Native + Expo**, consuming the self-hosted FastAPI backend with the custom **Sprout (09)** design system.

## Repositories

- **Backend**: https://github.com/dhairya9925/tabsy-backend
- **Frontend**: https://github.com/dhairya9925/tabsy-frontend
- **Mobile**: https://github.com/dhairya9925/tabsy-mobile (This repo)

## Features

- **Sprout Design System**: Calm, botanical aesthetics, soft mist green palettes, dark/light presets, and crisp typography (`Manrope` + `JetBrains Mono`).
- **4-Tab Core Experience**:
  - **Rhythm**: Dynamic dashboard pace, monthly pace card, and activity streaks.
  - **Journal**: Personal expenses, date-grouped entries, quick category filters.
  - **Shared**: 1-on-1 friends and shared living groups with monthly household ledgers and clearing settlement breakdowns.
  - **Insight**: Deep visual category spending analysis and balance charts.
  - **Floating Action Button**: Quick expense entry modal with whole-rupee keyboard and split calculators.
- **Offline First**: Local caching with outbox synchronization when network connectivity changes.
- **Self-Hosted Auth**: Full JWT authentication support with session persistence via `expo-secure-store`.
- **EAS & Android Ready**: Configured for EAS Build, Android 13+ monochrome adaptive launcher icons, and deep link resolution (`tabsy://`).

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Expo Go app or Android Emulator / Physical Device
- [EAS CLI](https://docs.expo.dev/build/introduction/) (optional, for cloud builds)

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/dhairya9925/tabsy-mobile.git
   cd tabsy-mobile
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Update EXPO_PUBLIC_API_URL if connecting to a local backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start Expo:
   ```bash
   npx expo start
   ```

5. Press `a` to run on connected Android device/emulator, or scan the QR code with Expo Go.

### Testing & Verification

```bash
# Run unit tests
npm test

# Check TypeScript types
npm run typecheck
```

## Android Native Build & Device Update (Gradle)

If you have an Android device connected via USB/Wi-Fi (with USB Debugging enabled) and want to build and update the app directly on the phone:

### 1. One-Step Build & Update on Device (Recommended)

This compiles the APK and updates the existing app on the connected phone while preserving app data:

- **Standalone Release APK** (embedded JS bundle, runs independently without Metro):
  ```bash
  cd android
  ./gradlew installRelease
  ```

- **Debug Build** (requires Metro running for live reload/debugging):
  ```bash
  cd android
  ./gradlew installDebug
  ```

*You can also run directly from the `tabsy-mobile` root without `cd`:*
```bash
./android/gradlew -p android installRelease
```

---

### 2. Manual Build & Install via ADB

#### Step 1: Build the APK
```bash
cd android
./gradlew assembleRelease
# Or for debug build:
# ./gradlew assembleDebug
```

Generated APK paths:
- **Release:** `android/app/build/outputs/apk/release/app-release.apk`
- **Debug:** `android/app/build/outputs/apk/debug/app-debug.apk`

#### Step 2: Update existing app on mobile
Check that your device is detected:
```bash
adb devices
```

Install/update directly (the `-r` flag replaces the existing app and preserves all app data):

- **If you are inside the `android/` folder:**
  ```bash
  adb install -r app/build/outputs/apk/release/app-release.apk
  ```

- **If you are in the `tabsy-mobile` root folder:**
  ```bash
  adb install -r android/app/build/outputs/apk/release/app-release.apk
  ```

> **Tip:** If you ever need to allow version downgrade or reinstall same version, add `-d`:
> ```bash
> adb install -r -d app/build/outputs/apk/release/app-release.apk
> ```

---

### Troubleshooting

- **`INSTALL_FAILED_UPDATE_INCOMPATIBLE`**:
  Occurs if the existing app on your mobile was signed with a different key (e.g., EAS Cloud build vs local debug keystore). To fix, uninstall the previous version and reinstall:
  ```bash
  adb uninstall com.tabsy.app
  adb install android/app/build/outputs/apk/release/app-release.apk
  ```
- **Device unauthorized / offline**:
  Check your phone screen and accept the USB Debugging RSA prompt, then verify with `adb devices`.

