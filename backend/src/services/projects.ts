/**
 * Video project services: get/update EDL, trigger draft re-render.
 */

import { prisma } from "../lib/prisma.js";
import { getBufferFromStoredUrl, uploadJsonToS3, generateStorageKey, VIDEO_PREFIX } from "../lib/storage.js";
import { validateEDL, type EDL } from "../edl/schema.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  enqueueDraftRender,
  processDraftRenderJob,
  isDraftRenderQueueAvailable,
} from "../lib/draftRenderQueue.js";

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
