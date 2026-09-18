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
