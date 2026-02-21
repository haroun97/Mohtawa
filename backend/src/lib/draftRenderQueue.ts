/**
 * Queue for async draft video re-renders. Uses same Redis as workflow queue when available.
 * When Redis is not set, runs render in-process (sync or setImmediate) and returns result.
 */

import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "./prisma.js";
import { getBufferFromStoredUrl } from "./storage.js";
import { uploadToS3, generateStorageKey, VIDEO_PREFIX, RENDERS_PREFIX } from "./storage.js";
import { renderDraftFromEDL } from "../video/render.js";
import { parseEDLSafe } from "../edl/schema.js";
import {
  setExportPreview,
  clearExportPreview,
} from "./exportPreviewStore.js";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "draft-render";

export interface DraftRenderJobData {
  projectId: string;
  userId: string;
}

function getConnectionOptions(): { host: string; port: number; password?: string } | null {
  if (!REDIS_URL) return null;
  try {
    const u = new URL(REDIS_URL);
    return {
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 6379,
      ...(u.password && { password: u.password }),
    };
  } catch {
    return null;
  }
}

let queue: Queue<DraftRenderJobData> | null = null;
let worker: Worker<DraftRenderJobData> | null = null;

export function getDraftRenderQueue(): Queue<DraftRenderJobData> | null {
  if (!REDIS_URL) return null;
  if (!queue) {
    const conn = getConnectionOptions();
    if (!conn) return null;
    queue = new Queue(QUEUE_NAME, {
      connection: conn,
      defaultJobOptions: {
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
        attempts: 2,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return queue;
}

export async function enqueueDraftRender(data: DraftRenderJobData): Promise<string | null> {
  const q = getDraftRenderQueue();
  if (!q) return null;
  const job = await q.add("render", data, { jobId: `draft-${data.projectId}-${Date.now()}` });
  return job.id ?? null;
}

export interface ProcessDraftRenderOptions {
  /** When true and no job (sync path), write progress/preview to in-memory store for polling. */
  enableSyncPreview?: boolean;
}

export async function processDraftRenderJob(
  data: DraftRenderJobData,
  job?: Job<DraftRenderJobData>,
  options?: ProcessDraftRenderOptions,
): Promise<void> {
  const { projectId, userId } = data;
  const project = await prisma.videoProject.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    throw new Error("Project not found or access denied");
  }
  const edlBuffer = await getBufferFromStoredUrl(project.edlUrl);
  const parsed = JSON.parse(edlBuffer.toString("utf-8"));
  const result = parseEDLSafe(parsed);
  if (!result.success) {
    throw new Error(`Invalid EDL: ${result.error}`);
  }
  const edl = result.edl;

  let voiceoverBuffer: Buffer | undefined;
  try {
    voiceoverBuffer = await getBufferFromStoredUrl(edl.audio.voiceoverUrl);
  } catch {
    // optional
  }

  const jobId = job?.id;
  const previewKey = jobId ? `${jobId}/preview/latest.jpg` : undefined;
  const useSyncPreview = !job && options?.enableSyncPreview;
  if (useSyncPreview) {
    setExportPreview(projectId, { progress: 0, previewBase64: null });
  }

  const draftBuffer = await renderDraftFromEDL({
    edl,
    voiceoverBuffer,
    getBufferFromUrl: (url: string) => getBufferFromStoredUrl(url),
    isDraft: true, // lower bitrate for preview
    onProgress:
      job && previewKey
        ? (percent, currentTimeSec) => {
            void job.updateProgress({
              percent,
              currentTimeSec,
              previewKey: `${RENDERS_PREFIX}/${previewKey}`,
            });
          }
        : useSyncPreview
          ? (percent) => {
              setExportPreview(projectId, { progress: percent });
            }
          : undefined,
    uploadPreviewFrame:
      job && previewKey
        ? async (jpegBuffer: Buffer) => {
            await uploadToS3(previewKey, jpegBuffer, "image/jpeg", RENDERS_PREFIX);
          }
        : useSyncPreview
          ? async (jpegBuffer: Buffer) => {
              setExportPreview(projectId, {
                previewBase64: jpegBuffer.toString("base64"),
              });
            }
          : undefined,
  });

  const videoKey = generateStorageKey(userId, "draft", "mp4");
  const upload = await uploadToS3(videoKey, draftBuffer, "video/mp4", VIDEO_PREFIX);

  await prisma.videoProject.update({
    where: { id: projectId },
    data: { draftVideoUrl: upload.url, updatedAt: new Date() },
  });

  if (job) {
    await job.updateProgress({
      percent: 1,
      previewKey: previewKey ? `${RENDERS_PREFIX}/${previewKey}` : undefined,
    });
  }
  if (useSyncPreview) {
    clearExportPreview(projectId);
  }
}

export function registerDraftRenderWorker(): void {
  if (!REDIS_URL || worker) return;
  const conn = getConnectionOptions();
  if (!conn) return;
  worker = new Worker(
    QUEUE_NAME,
    async (job: Job<DraftRenderJobData>) => {
      await processDraftRenderJob(job.data, job);
    },
    { connection: conn, concurrency: 2 },
  );
  worker.on("failed", (job, err) => {
    console.error(`[DraftRender] Job ${job?.id} failed:`, err?.message);
  });
}

export function isDraftRenderQueueAvailable(): boolean {
  return !!REDIS_URL;
}

export async function getDraftRenderJob(jobId: string): Promise<Job<DraftRenderJobData> | null> {
  const q = getDraftRenderQueue();
  if (!q) return null;
  const job = await q.getJob(jobId);
  return job ?? null;
}
