import type { EDL } from '@/lib/api';

/** CSS filter for live color preview */
export function buildPreviewFilter(color: EDL['color']): string {
  if (!color) return 'none';
  const s = color.saturation ?? 1;
  const c = color.contrast ?? 1;
  const v = color.vibrance ?? 1;
  const b = 0.85 + (v - 0.8) * 0.5;
  return `saturate(${s}) contrast(${c}) brightness(${Math.max(0.5, Math.min(1.5, b))})`;
}

/** Extract S3 key for presigned URL */
export function parseS3Key(url: string): string | null {
  if (typeof url !== 'string' || !url.startsWith('s3://')) return null;
  const m = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return m ? m[2] : null;
}

export const SUBTITLE_PRESETS = [
  { value: 'bold_white_shadow', label: 'Bold white shadow' },
  { value: 'yellow_caption', label: 'Yellow caption' },
  { value: 'minimal_lower', label: 'Minimal lower' },
] as const;
