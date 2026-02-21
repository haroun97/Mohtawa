/**
 * Workflow node: video.auto_edit — automated edit from clips + voiceover.
 * Builds EDL, uploads to S3, renders draft (placeholder if no FFmpeg), returns projectId, edlUrl, draftVideoUrl.
 */

import type { ExecutorResult, ExecutorContext } from "./index.js";
import { buildEDL } from "../video/autoEdit.js";
import type { ClipInput } from "../video/autoEdit.js";
import { validateEDL } from "../edl/schema.js";
import { prisma } from "../lib/prisma.js";
import {
  uploadToS3,
  uploadJsonToS3,
  generateStorageKey,
  VIDEO_PREFIX,
  getBufferFromStoredUrl,
} from "../lib/storage.js";
import { resolveInputDeep } from "../lib/resolveInput.js";
import { renderDraftFromEDL } from "../video/render.js";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { spawnSync } from "child_process";

const DEFAULT_VOICEOVER_DURATION_SEC = 30;

/**
 * Get the real duration of the voiceover audio (in seconds).
 * Uses ffprobe when available; falls back to DEFAULT_VOICEOVER_DURATION_SEC on failure.
 */
async function getVoiceoverDurationSec(voiceoverUrl: string): Promise<number> {
  let tmpDir: string | null = null;
  try {
    const buffer = await getBufferFromStoredUrl(voiceoverUrl);
    if (!buffer.length) return DEFAULT_VOICEOVER_DURATION_SEC;

    tmpDir = mkdtempSync(join(tmpdir(), "mohtawa-vo-probe-"));
    const ext = voiceoverUrl.toLowerCase().includes(".mp3") ? "mp3" : "mp4";
    const audioPath = join(tmpDir, `voice.${ext}`);
    writeFileSync(audioPath, buffer);

    const result = spawnSync(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        "-i", audioPath,
      ],
      { encoding: "utf-8", maxBuffer: 1024 * 1024 },
    );

    if (result.status !== 0 || !result.stdout?.trim()) {
      return DEFAULT_VOICEOVER_DURATION_SEC;
    }
    const sec = parseFloat(result.stdout.trim());
    return Number.isFinite(sec) && sec > 0 ? sec : DEFAULT_VOICEOVER_DURATION_SEC;
  } catch {
    return DEFAULT_VOICEOVER_DURATION_SEC;
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}

export async function executeVideoAutoEdit(ctx: ExecutorContext): Promise<ExecutorResult> {
  const { config, inputData, userId } = ctx;
  if (!userId) return { error: "User context missing for video.auto_edit." };

  let clipsRaw = resolveInputDeep<unknown>(inputData, "clips", "audio");
  if (!Array.isArray(clipsRaw) && config.clips) {
    try {
      const parsed = typeof config.clips === "string" ? JSON.parse(config.clips as string) : config.clips;
      clipsRaw = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      clipsRaw = undefined;
    }
  }
  const clips: ClipInput[] = Array.isArray(clipsRaw)
    ? clipsRaw.map((c: unknown) => {
        const o = c && typeof c === "object" ? c as Record<string, unknown> : {};
        return {
          url: String(o.url ?? ""),
          durationSec: typeof o.durationSec === "number" ? o.durationSec : undefined,
          tags: Array.isArray(o.tags) ? o.tags as string[] : undefined,
        };
      }).filter((c) => c.url)
    : [];
  const voiceoverUrlRaw = resolveInputDeep<string>(inputData, "voiceoverUrl", "audioUrl") ?? String(config.voiceoverUrl ?? "");
  const voiceoverUrl = voiceoverUrlRaw?.trim() ?? "";
  const captionsSrtUrl = resolveInputDeep<string>(inputData, "captionsSrtUrl") ?? String(config.captionsSrtUrl ?? "");

  if (!voiceoverUrl) {
    return {
      error:
        "Voiceover is required. Connect a Voice TTS node to the 'voiceover' input, or set 'Voiceover URL' in this node's config.",
    };
  }
  if (clips.length === 0) return { error: "At least one clip with url is required." };

  const aspectRatio = (config.aspectRatio as string) || "9:16";
  const stylePreset = (config.stylePreset as string) || "documentary";
  const minClipSec = Number(config.minClipSec) || 1.5;
  const maxClipSec = Number(config.maxClipSec) || 3.5;
  const enableMusic = !!config.enableMusic;
  const seed = typeof config.seed === "number" ? config.seed : undefined;

  const voiceoverDurationSec = await getVoiceoverDurationSec(voiceoverUrl);
  const edl = buildEDL(
    {
      clips,
      voiceoverDurationSec,
      minClipSec,
      maxClipSec,
      aspectRatio: aspectRatio as "9:16" | "1:1" | "16:9",
      voiceoverUrl,
      seed,
    },
    undefined, // hookText from first caption could be added
  );

  validateEDL(edl);

  const keyBase = generateStorageKey(userId, "edl", "json");
  const uploadEdl = await uploadJsonToS3(keyBase, edl, VIDEO_PREFIX);
  const edlUrl = uploadEdl.url;
  const edlKey = uploadEdl.key;

  let draftVideoUrl: string;
  try {
    let voiceoverBuffer: Buffer | undefined;
    try {
      voiceoverBuffer = await getBufferFromStoredUrl(voiceoverUrl);
    } catch {
      // optional for placeholder render
    }
    const draftBuffer = await renderDraftFromEDL({
      edl,
      voiceoverBuffer,
      getBufferFromUrl: (url: string) => getBufferFromStoredUrl(url),
    });
    const videoKey = generateStorageKey(userId, "draft", "mp4");
    const fullVideoKey = `${VIDEO_PREFIX}/${videoKey}`;
    const uploadVideo = await uploadToS3(videoKey, draftBuffer, "video/mp4", VIDEO_PREFIX);
    draftVideoUrl = uploadVideo.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Draft render or upload failed: ${msg}` };
  }

  const project = await prisma.videoProject.create({
    data: {
      userId,
      runId: ctx.executionId ?? undefined,
      edlUrl,
      draftVideoUrl,
      status: "draft",
    },
  });

  return {
    output: {
      projectId: project.id,
      edlUrl,
      edlKey,
      draftVideoUrl,
      voiceoverUrl,
      captionsSrtUrl: captionsSrtUrl || undefined,
    },
  };
}
