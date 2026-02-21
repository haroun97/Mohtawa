/**
 * Video render from EDL. Uses FFmpeg when available to produce a real MP4.
 * Falls back to placeholder when FFmpeg is missing or fetch fails.
 */

import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawn, spawnSync } from "child_process";
import type { EDL } from "../edl/schema.js";
import { buildAssFromEdl } from "./subtitles.js";

// Placeholder when FFmpeg not available or render fails
const MINIMAL_MP4 = Buffer.alloc(512, 0);

export interface RenderDraftOptions {
  edl: EDL;
  voiceoverBuffer?: Buffer;
  captionsSrtPath?: string;
  /** Fetcher for clip/asset URLs (s3:// or https). Required for real render. */
  getBufferFromUrl?: (url: string) => Promise<Buffer>;
  /** When true, use lower bitrate for faster preview (e.g. 4Mbps). */
  isDraft?: boolean;
  /** Called during final mux with progress 0..1 and current output time in seconds. */
  onProgress?: (percent: number, currentTimeSec: number) => void;
  /** Called with JPEG buffer for live preview frame; throttle to ~1/s. */
  uploadPreviewFrame?: (jpegBuffer: Buffer) => Promise<void>;
}

function isFfmpegAvailable(): boolean {
  try {
    const result = spawnSync("ffmpeg", ["-version"], {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function runFfmpeg(args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], {
      stdio: "pipe",
      cwd,
    });
    let stderr = "";
    proc.stderr?.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

/** Get duration in seconds of a video file via ffprobe. */
function getVideoDurationSec(filePath: string): number {
  const result = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0 || !result.stdout) return 0;
  const sec = parseFloat(result.stdout.trim());
  return Number.isFinite(sec) && sec > 0 ? sec : 0;
}

/** Run FFmpeg and report progress via onProgress(percent 0..1, currentTimeSec). */
function runFfmpegWithProgress(
  args: string[],
  durationSec: number,
  onProgress: (percent: number, currentTimeSec: number) => void,
  cwd?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], {
      stdio: "pipe",
      cwd,
    });
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => {
      const chunk = d.toString();
      stderr += chunk;
      const matches = [...chunk.matchAll(/out_time_ms=(\d+)/g)];
      const match = matches[matches.length - 1];
      if (match) {
        const outTimeSec = parseInt(match[1], 10) / 1_000_000;
        const percent = durationSec > 0 ? Math.min(1, outTimeSec / durationSec) : 0;
        onProgress(percent, outTimeSec);
      }
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

/** Extract a single frame as JPEG at timeSec from video with optional vf. */
function runFfmpegFrameAt(
  videoPath: string,
  timeSec: number,
  vf: string | null,
  cwd: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      "-ss", String(timeSec),
      "-i", videoPath,
      "-vframes", "1",
      "-f", "mjpeg",
      "pipe:1",
    ];
    if (vf) {
      args.splice(4, 0, "-vf", vf);
    }
    const proc = spawn("ffmpeg", ["-y", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
    });
    const chunks: Buffer[] = [];
    proc.stdout?.on("data", (d: Buffer) => chunks.push(d));
    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg frame failed: ${stderr.slice(-300)}`));
    });
    proc.on("error", reject);
  });
}

/** Simple hash for temp filenames from URL. */
function urlHash(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Timeline ordered by startSec for correct concat order. */
function sortTimelineByStart<T extends { startSec: number }>(timeline: T[]): T[] {
  return [...timeline].sort((a, b) => a.startSec - b.startSec);
}

/** Build color filter string (eq=saturation=X:contrast=Y). Omit if no color or defaults. */
function buildColorFilter(color: EDL["color"]): string {
  if (!color) return "";
  const s = color.saturation ?? 1;
  const c = color.contrast ?? 1;
  const v = color.vibrance ?? 1;
  if (s === 1 && c === 1 && v === 1) return "";
  const parts: string[] = [];
  if (s !== 1) parts.push(`saturation=${s}`);
  if (c !== 1) parts.push(`contrast=${c}`);
  if (v !== 1) parts.push(`brightness=${(v - 1) * 0.1}`);
  return parts.length ? `eq=${parts.join(":")}` : "";
}

/** Voice/music volume 0–1 from EDL audio; fallback from gainDb. */
function getAudioVolumes(edl: EDL): { voice: number; music: number } {
  const a = edl.audio;
  const voice = a.voiceVolume ?? (a.voiceGainDb != null ? 10 ** (a.voiceGainDb / 20) : 1);
  const music = a.musicVolume ?? (a.musicGainDb != null ? 10 ** (a.musicGainDb / 20) : 0.5);
  return { voice, music };
}

/**
 * Render draft preview from EDL: fetch clips, trim, concat, add voiceover, scale to output size.
 * Supports reorder (by startSec), color filters, music mix, draft vs final bitrate.
 */
export async function renderDraftFromEDL(options: RenderDraftOptions): Promise<Buffer> {
  const { edl, voiceoverBuffer, getBufferFromUrl, isDraft, onProgress, uploadPreviewFrame } = options;
  if (!isFfmpegAvailable() || !getBufferFromUrl) {
    return MINIMAL_MP4;
  }
  if (!edl.timeline || edl.timeline.length === 0) {
    return MINIMAL_MP4;
  }

  const timeline = sortTimelineByStart(edl.timeline);
  const videoBitrate = isDraft ? "4M" : "10M";

  const tmpDir = mkdtempSync(join(tmpdir(), "mohtawa-render-"));
  try {
    const { width, height } = edl.output;

    // 1. Download unique clips to temp files
    const uniqueUrls = [...new Set(timeline.map((t) => t.clipUrl))];
    const urlToPath: Record<string, string> = {};
    for (const url of uniqueUrls) {
      const buf = await getBufferFromUrl(url);
      const ext = url.toLowerCase().includes(".webm") ? "webm" : "mp4";
      const path = join(tmpDir, `clip_${urlHash(url)}.${ext}`);
      writeFileSync(path, buf);
      urlToPath[url] = path;
    }

    // 2. Trim each timeline segment to part_N.mp4 (video only)
    for (let i = 0; i < timeline.length; i++) {
      const seg = timeline[i];
      const durationSec = Math.max(0.04, seg.outSec - seg.inSec); // at least one frame
      const inputPath = urlToPath[seg.clipUrl];
      const outPath = join(tmpDir, `part_${i}.mp4`);
      await runFfmpeg([
        "-ss", String(seg.inSec),
        "-i", inputPath,
        "-t", String(durationSec),
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-an",
        outPath,
      ], tmpDir);
    }

    // 3. Concat parts (concat demuxer; order = timeline by startSec)
    const concatListPath = join(tmpDir, "concat.txt");
    const concatLines = timeline
      .map((_, i) => `file 'part_${i}.mp4'`)
      .join("\n");
    writeFileSync(concatListPath, concatLines);
    const videoOnlyPath = join(tmpDir, "video_only.mp4");
    await runFfmpeg([
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c", "copy",
      videoOnlyPath,
    ], tmpDir);

    // 4. Video filter: scale + pad + optional color + optional ASS subtitles
    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
    const colorFilter = buildColorFilter(edl.color);
    let vf = colorFilter ? `${scaleFilter},${colorFilter}` : scaleFilter;

    const assContent = buildAssFromEdl(edl);
    let assPath: string | null = null;
    if (assContent) {
      assPath = join(tmpDir, "subs.ass");
      writeFileSync(assPath, assContent, "utf-8");
      const assPathForFilter = assPath.replace(/\\/g, "/");
      vf = `${vf},ass='${assPathForFilter}'`;
    }

    const draftPath = join(tmpDir, "draft.mp4");
    const durationSec = getVideoDurationSec(videoOnlyPath);
    const useProgress = durationSec > 0 && onProgress && uploadPreviewFrame;
    let lastPreviewTime = -1;
    const progressCb = useProgress
      ? (percent: number, currentTimeSec: number) => {
          onProgress(percent, currentTimeSec);
          if (currentTimeSec - lastPreviewTime >= 0.8) {
            lastPreviewTime = currentTimeSec;
            runFfmpegFrameAt(videoOnlyPath, currentTimeSec, vf, tmpDir)
              .then(uploadPreviewFrame!)
              .catch(() => {});
          }
        }
      : undefined;

    const runFinalMux = (args: string[]) =>
      useProgress && progressCb
        ? runFfmpegWithProgress(args, durationSec, progressCb, tmpDir)
        : runFfmpeg(args, tmpDir);

    const { voice: voiceVol, music: musicVol } = getAudioVolumes(edl);
    const musicEnabled = edl.audio.musicEnabled === true && edl.audio.musicUrl;
    let musicBuffer: Buffer | null = null;
    if (musicEnabled && edl.audio.musicUrl) {
      try {
        musicBuffer = await getBufferFromUrl(edl.audio.musicUrl);
      } catch {
        musicBuffer = null;
      }
    }

    if (voiceoverBuffer && voiceoverBuffer.length > 0 && (!musicEnabled || !musicBuffer || musicBuffer.length === 0)) {
      const voicePath = join(tmpDir, "voiceover.mp3");
      writeFileSync(voicePath, voiceoverBuffer);
      await runFinalMux([
        "-i", videoOnlyPath,
        "-i", voicePath,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-b:v", videoBitrate,
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-filter:a", `volume=${voiceVol}`,
        "-map", "0:v",
        "-map", "1:a",
        "-shortest",
        draftPath,
      ]);
    } else if (musicEnabled && musicBuffer && musicBuffer.length > 0) {
      const musicPath = join(tmpDir, "music.mp3");
      writeFileSync(musicPath, musicBuffer);
      const hasVoice = voiceoverBuffer && voiceoverBuffer.length > 0;
      if (hasVoice) {
        const voicePath = join(tmpDir, "voiceover.mp3");
        writeFileSync(voicePath, voiceoverBuffer!);
        await runFinalMux([
          "-i", videoOnlyPath,
          "-i", voicePath,
          "-i", musicPath,
          "-vf", vf,
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", videoBitrate,
          "-pix_fmt", "yuv420p",
          "-filter_complex",
          `[1:a]volume=${voiceVol}[vo];[2:a]volume=${musicVol}[mu];[vo][mu]amix=inputs=2:duration=shortest[a]`,
          "-map", "0:v",
          "-map", "[a]",
          "-c:a", "aac",
          "-b:a", "128k",
          "-shortest",
          draftPath,
        ]);
      } else {
        await runFinalMux([
          "-i", videoOnlyPath,
          "-i", musicPath,
          "-vf", vf,
          "-c:v", "libx264",
          "-preset", "fast",
          "-b:v", videoBitrate,
          "-pix_fmt", "yuv420p",
          "-filter:a", `volume=${musicVol}`,
          "-map", "0:v",
          "-map", "1:a",
          "-shortest",
          "-c:a", "aac",
          "-b:a", "128k",
          draftPath,
        ]);
      }
    } else {
      await runFinalMux([
        "-i", videoOnlyPath,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-b:v", videoBitrate,
        "-pix_fmt", "yuv420p",
        "-an",
        draftPath,
      ]);
    }

    return readFileSync(draftPath);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[render] Draft render failed, using placeholder:", err);
    }
    return MINIMAL_MP4;
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

export interface RenderFinalOptions {
  edl: EDL;
  voiceoverBuffer?: Buffer;
  captionsSrtPath?: string;
  getBufferFromUrl?: (url: string) => Promise<Buffer>;
}

/**
 * Render final video from approved EDL. Same pipeline as draft; can add quality options later.
 */
export async function renderFinalFromEDL(options: RenderFinalOptions): Promise<Buffer> {
  return renderDraftFromEDL(options);
}
