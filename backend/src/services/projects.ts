/**
 * Video project services: get/update EDL, trigger draft re-render, timeline preview.
 */

import { createHash } from "crypto";
import { prisma } from "../lib/prisma.js";
import {
  getBufferFromStoredUrl,
  uploadJsonToS3,
  uploadToS3,
  generateStorageKey,
  VIDEO_PREFIX,
} from "../lib/storage.js";
import { validateEDL, type EDL } from "../edl/schema.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  enqueueDraftRender,
  processDraftRenderJob,
  isDraftRenderQueueAvailable,
} from "../lib/draftRenderQueue.js";
import { renderDraftFromEDL } from "../video/render.js";

/** In-memory cache for timeline preview URL by projectId:edlHash. TTL 15 min. */
const TIMELINE_PREVIEW_TTL_MS = 15 * 60 * 1000;
const timelinePreviewCache = new Map<
  string,
  { previewUrl: string; expiresAt: number }
>();

function getTimelinePreviewCacheKey(projectId: string, edlHash: string): string {
  return `${projectId}:${edlHash}`;
}

/** Stable hash of EDL for cache key (timeline order, trim, color). */
export function hashEdlForPreview(edl: EDL): string {
  const canonical = {
    timeline: edl.timeline.map((c) => ({
      clipUrl: c.clipUrl,
      inSec: c.inSec,
      outSec: c.outSec,
      startSec: c.startSec,
    })),
    color: edl.color
      ? {
          saturation: edl.color.saturation ?? 1,
          contrast: edl.color.contrast ?? 1,
          vibrance: edl.color.vibrance ?? 1,
        }
      : undefined,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

export async function listProjects(userId: string) {
  return prisma.videoProject.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function getProject(projectId: string, userId: string) {
  const project = await prisma.videoProject.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    throw new AppError(404, "Project not found");
  }
  return project;
}

export async function getEdl(projectId: string, userId: string): Promise<EDL> {
  const project = await getProject(projectId, userId);
  const buffer = await getBufferFromStoredUrl(project.edlUrl);
  const data = JSON.parse(buffer.toString("utf-8"));
  return validateEDL(data);
}

export async function updateEdl(projectId: string, userId: string, edl: unknown): Promise<{ edlUrl: string }> {
  const project = await getProject(projectId, userId);
  const validated = validateEDL(edl);
  const key = generateStorageKey(userId, "edl_updated", "json");
  const upload = await uploadJsonToS3(key, validated, VIDEO_PREFIX);
  await prisma.videoProject.update({
    where: { id: projectId },
    data: { edlUrl: upload.url, updatedAt: new Date() },
  });
  return { edlUrl: upload.url };
}

export interface RenderDraftResult {
  jobId?: string;
  status: "queued" | "processing" | "completed";
  draftVideoUrl?: string;
}

/** Color override for preview (saturation, contrast, vibrance). */
export interface PreviewColorInput {
  saturation?: number;
  contrast?: number;
  vibrance?: number;
}

/** Timeline preview result: one URL for smooth playback (CapCut/iEdit-like). */
export interface TimelinePreviewResult {
  status: "ready";
  previewUrl: string;
}

/** Get or generate a single timeline-preview stream URL (cached by EDL hash). Reuses render pipeline; max 3 min for speed. */
export async function getTimelinePreview(
  projectId: string,
  userId: string,
  edlOverride?: unknown,
): Promise<TimelinePreviewResult> {
  const edl: EDL = edlOverride != null ? validateEDL(edlOverride) : await getEdl(projectId, userId);
  const edlHash = hashEdlForPreview(edl);
  const cacheKey = getTimelinePreviewCacheKey(projectId, edlHash);
  const cached = timelinePreviewCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { status: "ready", previewUrl: cached.previewUrl };
  }

  let voiceoverBuffer: Buffer | undefined;
  try {
    voiceoverBuffer = await getBufferFromStoredUrl(edl.audio.voiceoverUrl);
  } catch {
    // optional
  }

  const maxPreviewSec = 180;
  const previewBuffer = await renderDraftFromEDL({
    edl,
    voiceoverBuffer,
    getBufferFromUrl: (url: string) => getBufferFromStoredUrl(url),
    isDraft: true,
    maxDurationSec: maxPreviewSec,
  });

  const key = generateStorageKey(userId, `preview_timeline_${projectId}_${edlHash}`, "mp4");
  const upload = await uploadToS3(key, previewBuffer, "video/mp4", VIDEO_PREFIX);
  const previewUrl = upload.url;
  timelinePreviewCache.set(cacheKey, {
    previewUrl,
    expiresAt: Date.now() + TIMELINE_PREVIEW_TTL_MS,
  });
  return { status: "ready", previewUrl };
}

/** Render a short segment (first 15s) with the given color and return a playable URL. */
export async function renderColorPreview(
  projectId: string,
  userId: string,
  color: PreviewColorInput,
): Promise<{ previewUrl: string }> {
  const edl = await getEdl(projectId, userId);
  const mergedColor = { ...(edl.color ?? {}), ...color };
  const edlWithColor: EDL = { ...edl, color: mergedColor };

  let voiceoverBuffer: Buffer | undefined;
  try {
    voiceoverBuffer = await getBufferFromStoredUrl(edl.audio.voiceoverUrl);
  } catch {
    // optional
  }

  const previewBuffer = await renderDraftFromEDL({
    edl: edlWithColor,
    voiceoverBuffer,
    getBufferFromUrl: (url: string) => getBufferFromStoredUrl(url),
    isDraft: true,
    maxDurationSec: 15,
  });

  const key = generateStorageKey(userId, `preview_${projectId}_${Date.now()}`, "mp4");
  const upload = await uploadToS3(key, previewBuffer, "video/mp4", VIDEO_PREFIX);
  return { previewUrl: upload.url };
}

export async function renderDraft(projectId: string, userId: string): Promise<RenderDraftResult> {
  await getProject(projectId, userId);

  if (isDraftRenderQueueAvailable()) {
    const jobId = await enqueueDraftRender({ projectId, userId });
    return {
      jobId: jobId ?? undefined,
      status: jobId ? "queued" : "processing",
    };
  }

  await processDraftRenderJob(
    { projectId, userId },
    undefined,
    { enableSyncPreview: true },
  );
  const project = await getProject(projectId, userId);
  return {
    status: "completed",
    draftVideoUrl: project.draftVideoUrl ?? undefined,
  };
}
