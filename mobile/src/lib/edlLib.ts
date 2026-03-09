/**
 * EDL types and helpers — aligned with web frontend (frontend/src/lib/api.ts).
 * Used by EdlEditorScreen for full editor parity.
 */

export interface EdlTimelineClip {
  id?: string;
  clipUrl: string;
  inSec: number;
  outSec: number;
  startSec: number;
  sourceDurationSec?: number;
}

export interface EdlTextOverlay {
  id?: string;
  type: 'text';
  text: string;
  startSec: number;
  endSec: number;
  position?: 'top' | 'center' | 'bottom';
  style?: string;
  stylePreset?: string;
}

export interface EdlAudio {
  voiceoverUrl: string;
  musicUrl?: string;
  voiceGainDb?: number;
  musicGainDb?: number;
  musicEnabled?: boolean;
  musicVolume?: number;
  voiceVolume?: number;
  originalVolume?: number;
  applyOriginalToAll?: boolean;
  videoTrackMuted?: boolean;
  audioTrackMuted?: boolean;
  musicTrackMuted?: boolean;
  /** Timeline range (seconds) where music is audible. When absent, music spans full timeline. */
  musicStartSec?: number;
  musicEndSec?: number;
  /** Timeline range (seconds) where voice is audible. When absent, voice spans full timeline. */
  voiceStartSec?: number;
  voiceEndSec?: number;
}

export interface EdlColor {
  saturation?: number;
  contrast?: number;
  vibrance?: number;
  /** Timeline range (seconds) where color/filter applies. When absent, applies to full timeline. */
  startSec?: number;
  endSec?: number;
}

export interface EdlOutput {
  width: number;
  height: number;
  fps?: number;
}

export interface EDL {
  timeline: EdlTimelineClip[];
  overlays: EdlTextOverlay[];
  audio: EdlAudio;
  color?: EdlColor;
  output: EdlOutput;
}

/** Ensure timeline and overlay items have ids; default color and audio fields. */
export function ensureEdlIds(data: EDL): EDL {
  return {
    ...data,
    timeline: data.timeline.map((c, i) => ({
      ...c,
      id: c.id ?? `clip-${i}`,
    })),
    overlays: data.overlays.map((o, i) => ({
      ...o,
      id: (o as EdlTextOverlay).id ?? `overlay-${i}`,
    })),
    color: data.color ?? { saturation: 1, contrast: 1, vibrance: 1 },
    audio: {
      ...data.audio,
      musicEnabled: data.audio.musicEnabled ?? false,
      musicVolume: data.audio.musicVolume ?? 0.5,
      voiceVolume: data.audio.voiceVolume ?? 1,
    },
  };
}

/** Parse S3 key from s3://bucket/key; return null for HTTP or invalid. */
export function parseS3Key(url: string): string | null {
  if (typeof url !== 'string' || !url.startsWith('s3://')) return null;
  const m = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return m ? m[2] : null;
}

/** Map export resolution to output dimensions (16:9). */
export type ExportResolution = 'HD' | '2K' | '4K';
export type ExportFps = 24 | 30 | 60;

export function resolutionToOutput(resolution: ExportResolution): { width: number; height: number } {
  switch (resolution) {
    case '4K':
      return { width: 3840, height: 2160 };
    case '2K':
      return { width: 2560, height: 1440 };
    case 'HD':
    default:
      return { width: 1920, height: 1080 };
  }
}

export const HISTORY_MAX = 50;

/** Split timeline at playhead (timeline time). Playhead must be inside clip. Returns null if invalid. */
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

export const SUBTITLE_PRESETS = [
  { value: 'bold_white_shadow', label: 'Bold white shadow' },
  { value: 'yellow_caption', label: 'Yellow caption' },
  { value: 'minimal_lower', label: 'Minimal lower' },
] as const;
