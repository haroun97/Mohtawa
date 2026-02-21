/**
 * Auto-edit algorithm: select clips to cover voiceover duration, build EDL.
 * Unit-testable; no FFmpeg or S3 here.
 */

import type { EDL, TimelineClip, EdlAudio, EdlOutput } from "../edl/schema.js";

export interface ClipInput {
  url: string;
  durationSec?: number;
  tags?: string[];
}

export interface AutoEditParams {
  clips: ClipInput[];
  voiceoverDurationSec: number;
  minClipSec: number;
  maxClipSec: number;
  aspectRatio: "9:16" | "1:1" | "16:9";
  voiceoverUrl: string;
  musicUrl?: string;
  seed?: number;
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/**
 * Select clips and trim to [minClipSec, maxClipSec] to cover target duration.
 * Returns timeline entries with startSec advancing on the timeline.
 */
export function selectAndTrimClips(
  clips: ClipInput[],
  targetDurationSec: number,
  minClipSec: number,
  maxClipSec: number,
  seed?: number,
): TimelineClip[] {
  if (clips.length === 0 || targetDurationSec <= 0) return [];

  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  const timeline: TimelineClip[] = [];
  let timelineSec = 0;

  // Shuffle optionally by seed for reproducibility
  const order = [...clips];
  if (seed !== undefined) shuffle(order, rng);

  let clipIndex = 0;
  while (timelineSec < targetDurationSec && order.length > 0) {
    const clip = order[clipIndex % order.length];
    const duration = clip.durationSec ?? maxClipSec;
    const takeSec = Math.min(
      maxClipSec,
      Math.max(minClipSec, duration),
      targetDurationSec - timelineSec,
    );
    if (takeSec <= 0) break;

    const inSec = 0;
    const outSec = takeSec;
    timeline.push({
      clipUrl: clip.url,
      inSec,
      outSec,
      startSec: timelineSec,
    });
    timelineSec += takeSec;
    clipIndex++;
  }

  return timeline;
}

function shuffle<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Build EDL from params. Optionally add a hook text overlay for first 1.5s.
 */
export function buildEDL(params: AutoEditParams, hookText?: string): EDL {
  const { width, height } = ASPECT_RATIOS[params.aspectRatio] ?? ASPECT_RATIOS["9:16"];
  const timeline = selectAndTrimClips(
    params.clips,
    params.voiceoverDurationSec,
    params.minClipSec,
    params.maxClipSec,
    params.seed,
  );

  const overlays: EDL["overlays"] = [];
  if (hookText && hookText.trim()) {
    overlays.push({
      type: "text",
      text: hookText.trim(),
      startSec: 0,
      endSec: 1.5,
      position: "bottom",
    });
  }

  const audio: EdlAudio = {
    voiceoverUrl: params.voiceoverUrl,
    voiceGainDb: 0,
  };
  if (params.musicUrl) {
    audio.musicUrl = params.musicUrl;
    audio.musicGainDb = -18;
  }

  const output: EdlOutput = {
    width,
    height,
    fps: 30,
  };

  return {
    timeline,
    overlays,
    audio,
    output,
  };
}
