/**
 * Helpers to resolve final video URL (S3 or https) and trigger browser download.
 */

import { api } from '@/lib/api';
import { parseS3KeyFromUrl } from '@/lib/audioPlayback';

export function hasFinalVideoOutput(output: Record<string, unknown> | null | undefined): boolean {
  if (!output || typeof output !== 'object') return false;
  return typeof (output as { finalVideoUrl?: string; finalVideoKey?: string }).finalVideoUrl === 'string' ||
    typeof (output as { finalVideoUrl?: string; finalVideoKey?: string }).finalVideoKey === 'string';
}

/**
 * Resolve final video to a URL suitable for download (presigned if S3).
 */
export async function getFinalVideoDownloadUrl(output: Record<string, unknown>): Promise<string> {
  const o = output as { finalVideoUrl?: string; finalVideoKey?: string };
  const key = o.finalVideoKey;
  const url = o.finalVideoUrl;

  if (typeof key === 'string' && key.trim()) {
    const res = await api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key.trim())}`);
    return res.url;
  }
  if (typeof url === 'string' && url.startsWith('http')) {
    return url;
  }
  if (typeof url === 'string') {
    const parsedKey = parseS3KeyFromUrl(url);
    if (parsedKey) {
      const res = await api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(parsedKey)}`);
      return res.url;
    }
  }
  throw new Error('No final video URL or key in output');
}

/**
 * Fetch the URL and trigger a file download in the browser.
 * Returns a Promise that resolves when the download has been triggered, or rejects on failure.
 */
export function triggerVideoDownload(url: string, filename: string = 'final-video.mp4'): Promise<void> {
  return fetch(url, { mode: 'cors' })
    .then((res) => {
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => {
      console.error('Video download failed:', err);
      window.open(url, '_blank');
      throw err;
    });
}
