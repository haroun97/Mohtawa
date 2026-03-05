import { config } from './env';
import { authStorage } from './authStorage';

const baseUrl = config.apiBaseUrl.replace(/\/$/, '');

export type ApiRequestInit = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
};

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await authStorage.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function buildUrl(path: string, params?: ApiRequestInit['params']): string {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) search.set(k, String(v));
  }
  const q = search.toString();
  return q ? `${url}?${q}` : url;
}

/**
 * API client with configurable base URL (EXPO_PUBLIC_API_URL) and auth token from secure storage.
 */
export async function api<T = unknown>(
  path: string,
  init?: ApiRequestInit
): Promise<T> {
  const { params, ...rest } = init ?? {};
  const url = buildUrl(path, params);
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    ...rest,
    headers: { ...headers, ...rest.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}

export const apiClient = {
  get: <T = unknown>(path: string, init?: ApiRequestInit) =>
    api<T>(path, { ...init, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, init?: ApiRequestInit) =>
    api<T>(path, { ...init, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown, init?: ApiRequestInit) =>
    api<T>(path, { ...init, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown, init?: ApiRequestInit) =>
    api<T>(path, { ...init, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string, init?: ApiRequestInit) =>
    api<T>(path, { ...init, method: 'DELETE' }),
};
