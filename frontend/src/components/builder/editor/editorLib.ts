import type { EDL, EdlTimelineClip } from '@/lib/api';

/**
 * Returns new timeline with clip at clipIndex split at playheadSec (timeline time).
 * Playhead must be strictly inside the clip segment. Returns null if invalid.
 * Used by split-at-playhead in the editor.
 */
export function splitTimelineAtPlayhead(
  timeline: EdlTimelineClip[],
  clipIndex: number,
  playheadSec: number
): EdlTimelineClip[] | null {
  if (clipIndex < 0 || clipIndex >= timeline.length) return null;
  const clip = timeline[clipIndex];
  const segStart = clip.startSec;
  const segEnd = segStart + Math.max(0.04, clip.outSec - clip.inSec);
  if (playheadSec <= segStart || playheadSec >= segEnd) return null;
  const duration = clip.outSec - clip.inSec;
  const t = (playheadSec - segStart) / (segEnd - segStart);
  const splitInOut = clip.inSec + t * duration;
  const first: EdlTimelineClip = {
    ...clip,
    id: clip.id ?? `clip-${clipIndex}`,
    outSec: splitInOut,
  };
  const second: EdlTimelineClip = {
    ...clip,
    id: `clip-${Date.now()}-split`,
    inSec: splitInOut,
    outSec: clip.outSec,
  };
  const next = [...timeline];
  next.splice(clipIndex, 1, first, second);
  let startSec = 0;
  return next.map((c) => {
    const dur = Math.max(0.04, c.outSec - c.inSec);
    const out = { ...c, startSec, outSec: c.inSec + dur };
    startSec += dur;
    return out;
  });
}

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
