/**
 * Helpers and types for playable audio from workflow run output (S3 key or URL).
 */

/** Get S3 key from step output (direct or nested). Returns key for /api/storage/play. */
export function getAudioKey(output: Record<string, unknown> | null | undefined): string | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as { audioKey?: string; audioUrl?: string };
  if (typeof o.audioKey === 'string' && o.audioKey.trim()) return o.audioKey.trim();
  for (const v of Object.values(output)) {
    if (v && typeof v === 'object') {
      const vv = v as Record<string, unknown>;
      if (typeof vv.audioKey === 'string' && vv.audioKey.trim()) return vv.audioKey.trim();
    }
  }
  return null;
}

/** Get direct HTTPS audio URL from output (e.g. when S3_PUBLIC_BASE_URL is set). */
export function getDirectAudioUrl(output: Record<string, unknown> | null | undefined): string | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as { audioUrl?: string };
  if (typeof o.audioUrl === 'string' && o.audioUrl.startsWith('http')) return o.audioUrl;
  for (const v of Object.values(output)) {
    if (v && typeof v === 'object') {
      const u = (v as Record<string, unknown>).audioUrl;
      if (typeof u === 'string' && u.startsWith('http')) return u;
    }
  }
  return null;
}

/** Parse S3 key from s3://bucket/key URL (for older runs without audioKey). */
export function parseS3KeyFromUrl(audioUrl: string): string | null {
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('s3://')) return null;
  const m = audioUrl.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return m ? m[2] : null;
}

/** Get audio key from output: audioKey field, or parse from audioUrl if s3://. */
export function getAudioKeyOrFromUrl(output: Record<string, unknown> | null | undefined): string | null {
  const key = getAudioKey(output);
  if (key) return key;
  const url = getAudioUrlForParsing(output);
  return url ? parseS3KeyFromUrl(url) : null;
}

function getAudioUrlForParsing(output: Record<string, unknown> | null | undefined): string | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as { audioUrl?: string };
  if (typeof o.audioUrl === 'string') return o.audioUrl;
  for (const v of Object.values(output)) {
    if (v && typeof v === 'object') {
      const u = (v as Record<string, unknown>).audioUrl;
      if (typeof u === 'string') return u;
    }
  }
  return null;
}

/** Whether this output has playable audio (direct URL or S3 key). */
export function hasPlayableAudio(output: Record<string, unknown> | null | undefined): boolean {
  return !!(getDirectAudioUrl(output) || getAudioKeyOrFromUrl(output));
}
