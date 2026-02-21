/**
 * Workflow node: review.approval_gate — human-in-the-loop approve or edit EDL.
 * In manual modes: creates ReviewSession, returns pauseForReview so execution pauses.
 */

import type { ExecutorResult, ExecutorContext } from "./index.js";
import { prisma } from "../lib/prisma.js";
import { resolveInputDeep } from "../lib/resolveInput.js";

export async function executeReviewApprovalGate(ctx: ExecutorContext): Promise<ExecutorResult> {
  const { config, inputData, userId, executionId, nodeId } = ctx;
  if (!userId) return { error: "User context missing for review.approval_gate." };

  const projectId = resolveInputDeep<string>(inputData, "projectId");
  const draftVideoUrl = resolveInputDeep<string>(inputData, "draftVideoUrl");
  const edlUrl = resolveInputDeep<string>(inputData, "edlUrl");

  if (!projectId || !edlUrl) {
    return { error: "projectId and edlUrl are required (from upstream video.auto_edit)." };
  }

  const mode = (config.mode as string) || "auto_approve";
  const autoApproveAfterSec = typeof config.autoApproveAfterSec === "number" ? config.autoApproveAfterSec : undefined;

  if (mode === "auto_approve") {
    return {
      output: {
        projectId,
        draftVideoUrl: draftVideoUrl ?? undefined,
        approvedEdlUrl: edlUrl,
      },
    };
  }

  // manual_review or manual_with_timeout: pause for human review
  if (!executionId) {
    return { error: "Execution context missing; cannot create review session." };
  }

  const expiresAt =
    mode === "manual_with_timeout" && autoApproveAfterSec != null
      ? new Date(Date.now() + autoApproveAfterSec * 1000)
      : null;

  const session = await prisma.reviewSession.upsert({
    where: {
      runId_stepId: { runId: executionId, stepId: nodeId },
    },
    create: {
      runId: executionId,
      stepId: nodeId,
      projectId,
      status: "pending",
      expiresAt,
    },
    update: {
      projectId,
      status: "pending",
      expiresAt,
    },
  });

  return {
    output: {
      projectId,
      draftVideoUrl: draftVideoUrl ?? undefined,
      edlUrl,
      approvedEdlUrl: edlUrl, // will be overwritten on resolve
      reviewSessionId: session.id,
    },
    pauseForReview: true,
    reviewSessionId: session.id,
  };
}
