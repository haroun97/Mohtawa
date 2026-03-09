/**
 * App config from environment.
 * - Production / explicit: set EXPO_PUBLIC_API_URL (e.g. https://api.example.com/api).
 * - Development on device: if EXPO_PUBLIC_API_URL is not set, we use the same host as the
 *   Metro bundler (from expo-constants) so the app can reach your local backend without
 *   configuring an IP (e.g. http://192.168.1.5:3001/api).
 * - Development on simulator: localhost fallback when no hostUri is available.
 */
import Constants from 'expo-constants';

const BACKEND_PORT = '3001';
const API_PATH = '/api';

function getDevApiBaseUrl(): string {
  try {
    // Newer: expoConfig.hostUri (e.g. "192.168.1.5:8081")
    const hostUri =
      (Constants.expoConfig as { hostUri?: string } | undefined)?.hostUri ??
      (Constants.manifest as { hostUri?: string } | undefined)?.hostUri;
    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0]?.trim();
      if (host) {
        return `http://${host}:${BACKEND_PORT}${API_PATH}`;
      }
    }
    // Legacy: debuggerHost
    const debuggerHost = (Constants.manifest as { debuggerHost?: string } | undefined)?.debuggerHost;
    if (debuggerHost && typeof debuggerHost === 'string') {
      const host = debuggerHost.split(':')[0]?.trim();
      if (host) {
        return `http://${host}:${BACKEND_PORT}${API_PATH}`;
      }
    }
  } catch {
    // ignore
  }
  return `http://localhost:${BACKEND_PORT}${API_PATH}`;
}

function getApiBaseUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim().replace(/\/$/, '');
  }
  // In development, use Metro host so physical device can reach local backend
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return getDevApiBaseUrl();
  }
  return `http://localhost:${BACKEND_PORT}${API_PATH}`;
}

export const config = {
  get apiBaseUrl(): string {
    return getApiBaseUrl();
  },
} as const;
