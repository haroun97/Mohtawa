import { useState, useEffect } from 'react';
import { storageApi } from './api/endpoints';

/** Parse S3 key from s3://bucket/key or return as-is if it looks like a storage key. */
function parseStorageKey(url: string): string | null {
  if (url.startsWith('s3://')) {
    const m = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
    return m ? m[2] : null;
  }
  if (url.startsWith('http')) return null;
  return url.trim() || null;
}

/** Resolve draftVideoUrl/finalVideoUrl to a playable URL (presigned for S3/storage). */
export function usePlayableVideoUrl(rawUrl: string | null): { playUrl: string | null; loading: boolean } {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rawUrl) {
      setPlayUrl(null);
      setLoading(false);
      return;
    }
    if (rawUrl.startsWith('http')) {
      setPlayUrl(rawUrl);
      setLoading(false);
      return;
    }
    const key = parseStorageKey(rawUrl);
    if (!key) {
      setPlayUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    storageApi
      .playUrl(key)
      .then((res) => {
        if (!cancelled) setPlayUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setPlayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rawUrl]);

  return { playUrl, loading };
}
