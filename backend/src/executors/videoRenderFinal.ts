/**
 * Workflow node: video.render_final — render final video from approved EDL.
 */

import type { ExecutorResult, ExecutorContext } from "./index.js";
import { parseEDLSafe } from "../edl/schema.js";
import { getBufferFromStoredUrl } from "../lib/storage.js";
import { uploadToS3, generateStorageKey, VIDEO_PREFIX } from "../lib/storage.js";
import { resolveInputDeep } from "../lib/resolveInput.js";
import { renderFinalFromEDL } from "../video/render.js";

export async function executeVideoRenderFinal(ctx: ExecutorContext): Promise<ExecutorResult> {
  const { inputData, userId } = ctx;
  if (!userId) return { error: "User context missing for video.render_final." };

  const projectId = resolveInputDeep<string>(inputData, "projectId");
  const approvedEdlUrl = resolveInputDeep<string>(inputData, "approvedEdlUrl");
  const voiceoverUrl = resolveInputDeep<string>(inputData, "voiceoverUrl");
  const captionsSrtUrl = resolveInputDeep<string>(inputData, "captionsSrtUrl");

  if (!approvedEdlUrl) return { error: "approvedEdlUrl is required (from approval gate)." };

  let edlBuffer: Buffer;
  try {
    edlBuffer = await getBufferFromStoredUrl(approvedEdlUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to load EDL from ${approvedEdlUrl.slice(0, 50)}...: ${msg}` };
  }

  const parsed = JSON.parse(edlBuffer.toString("utf-8"));
  const result = parseEDLSafe(parsed);
  if (!result.success) return { error: `Invalid EDL: ${result.error}` };
  const edl = result.edl;

  let voiceoverBuffer: Buffer | undefined;
  if (voiceoverUrl) {
    try {
      voiceoverBuffer = await getBufferFromStoredUrl(voiceoverUrl);
    } catch {
      // optional
    }
  }

  const videoBuffer = await renderFinalFromEDL({
    edl,
    voiceoverBuffer,
    getBufferFromUrl: (url: string) => getBufferFromStoredUrl(url),
  });

  const videoKey = generateStorageKey(userId, "final", "mp4");
  const upload = await uploadToS3(videoKey, videoBuffer, "video/mp4", VIDEO_PREFIX);

  return {
    output: {
      projectId: projectId ?? undefined,
      finalVideoUrl: upload.url,
      finalVideoKey: upload.key,
    },
  };
}
