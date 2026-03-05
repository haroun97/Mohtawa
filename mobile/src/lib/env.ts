/**
 * App config from environment.
 * Set EXPO_PUBLIC_API_URL in .env or in EAS / local env (e.g. http://localhost:3000).
 */
export const config = {
  apiBaseUrl:
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
    'http://localhost:3000',
} as const;
