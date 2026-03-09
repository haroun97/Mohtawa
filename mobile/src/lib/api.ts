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

/** POST with FormData (e.g. file upload). Do not set Content-Type so fetch sets boundary. */
export async function apiFormData<T = unknown>(
  path: string,
  formData: FormData,
  init?: ApiRequestInit
): Promise<T> {
  const { params, ...rest } = init ?? {};
  const url = buildUrl(path, params);
  const token = await authStorage.getToken();
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    ...rest,
    method: 'POST',
    body: formData,
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

export const UPLOAD_ABORTED_MESSAGE = 'Request aborted';

/**
 * POST FormData with upload progress (XHR). onProgress(percent 0-100) is called during upload.
 * totalBytes is optional; if provided (e.g. file size), percent is computed from bytes sent.
 * Returns { promise, abort } so the caller can cancel the upload.
 */
export function apiFormDataWithProgress<T = unknown>(
  path: string,
  formData: FormData,
  options: {
    params?: ApiRequestInit['params'];
    totalBytes?: number;
    onProgress?: (percent: number) => void;
  } = {}
): { promise: Promise<T>; abort: () => void } {
  const { params, totalBytes, onProgress } = options;
  const url = buildUrl(path, params);
  let xhr: XMLHttpRequest | null = null;
  const abort = () => {
    if (xhr) {
      xhr.abort();
      xhr = null;
    }
  };
  const promise = new Promise<T>((resolve, reject) => {
    xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    authStorage.getToken().then((token) => {
      if (!xhr) return;
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.addEventListener('progress', (e) => {
        if (!onProgress) return;
        let percent = 0;
        if (totalBytes != null && totalBytes > 0) {
          percent = Math.min(99, (e.loaded / totalBytes) * 100);
        } else if (e.lengthComputable && e.total > 0) {
          percent = Math.min(99, (e.loaded / e.total) * 100);
        }
        onProgress(percent);
      });
      xhr.addEventListener('load', () => {
        if (xhr!.status < 200 || xhr!.status >= 300) {
          reject(new Error(`API ${xhr!.status}: ${xhr!.responseText || xhr!.statusText}`));
          return;
        }
        onProgress?.(100);
        const ct = xhr!.getResponseHeader('content-type');
        if (ct?.includes('application/json')) {
          try {
            resolve(JSON.parse(xhr!.responseText) as T);
          } catch {
            resolve(xhr!.responseText as unknown as T);
          }
        } else {
          resolve(xhr!.responseText as unknown as T);
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error(UPLOAD_ABORTED_MESSAGE)));
      xhr.send(formData);
    });
  });
  return { promise, abort };
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

/** Request without Authorization header (for login/register). */
export async function apiUnauth<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const url = buildUrl(path);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try {
      const j = JSON.parse(text);
      if (j?.error) message = j.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) return res.json() as Promise<T>;
  return res.text() as unknown as T;
}
