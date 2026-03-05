# Mohtawa Mobile

React Native app built with **Expo** and **Expo Dev Client** (TypeScript). Uses React Navigation (native stack + bottom tabs), TanStack Query, Zustand, Zod, React Hook Form, Reanimated, Gesture Handler, Bottom Sheet, Lucide icons, Expo Image/AV/FileSystem/Sharing/SecureStore, and AsyncStorage.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start Expo dev server (Metro). |
| `npm run ios` | Start and open iOS simulator (requires macOS). |
| `npm run android` | Start and open Android emulator. |
| `npm run prebuild` | Generate native `ios` and `android` folders (required for Dev Client). |
| `npm run dev-client` | Build and run the **Dev Client** app on iOS (native modules; requires macOS). |

## Running on a physical iPhone

### Option 1: Expo Go (quick UI testing)

1. Install **Expo Go** from the App Store on your iPhone.
2. In the repo: `cd mobile && npm run start`.
3. Scan the QR code with the Camera app (or Expo Go). The app will load in Expo Go.

**Limitation:** Expo Go does not include native modules such as `expo-dev-client`, `react-native-reanimated`, `@gorhom/bottom-sheet`, or `expo-av` in the way a custom build does. For full native module support, use a Dev Client build (Option 2).

### Option 2: Dev Client (native modules, recommended for real development)

1. **macOS required** for building the iOS app. If you don’t have a Mac, you can use EAS Build in the cloud to produce an iOS build, or build later on a Mac/CI.
2. Install Xcode and CocoaPods (and run `pod install` in `mobile/ios` after prebuild if needed).
3. From `mobile/` run:
   - `npm run prebuild` — generates the `ios` and `android` folders.
   - `npm run dev-client` — builds and runs the iOS app with the Dev Client. Connect your iPhone via USB and select it as the run destination if desired.
4. Once the Dev Client app is installed on the device, start the dev server with `npm run start` and open the project from the Dev Client (e.g. by scanning the QR code or entering the URL). The app will load with all native modules (Reanimated, Bottom Sheet, expo-av, etc.).

### iOS builds without a Mac

- Use [EAS Build](https://docs.expo.dev/build/introduction/) (Expo Application Services) to build in the cloud.
- Or run the iOS build on a Mac later (e.g. in CI or on a teammate’s machine).

## Environment

- Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to your backend base URL (e.g. `http://192.168.1.10:3000` for a physical device on the same LAN). No trailing slash.
- Auth token is stored via `expo-secure-store` (see `src/lib/authStorage.ts`).

## MVP screens

- **Projects** — list of projects (placeholder).
- **Runs** — workflow runs (placeholder).
- **Review Queue** — items awaiting review (placeholder).
- **Settings** — app settings (placeholder).

Navigation is implemented with bottom tabs; all four screens are placeholders and the app should boot and switch between them.
