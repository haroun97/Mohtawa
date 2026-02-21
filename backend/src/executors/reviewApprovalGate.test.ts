import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeReviewApprovalGate } from "./reviewApprovalGate";
import type { ExecutorContext } from "./index";

vi.mock("../lib/prisma", () => ({
  prisma: {
    reviewSession: {
      upsert: vi.fn(),
    },
  },
}));

const { prisma } = await import("../lib/prisma");

describe("executeReviewApprovalGate", () => {
  const baseCtx: ExecutorContext = {
    nodeId: "step-1",
    nodeType: "review.approval_gate",
    category: "review",
    config: {},
    inputData: {
      projectId: "proj-1",
      draftVideoUrl: "https://example.com/draft.mp4",
      edlUrl: "https://example.com/edl.json",
    },
    getApiKey: vi.fn(),
    userId: "user-1",
    executionId: "exec-1",
    stepIndex: 0,
  };

  beforeEach(() => {
    vi.mocked(prisma.reviewSession.upsert).mockResolvedValue({
      id: "session-1",
      runId: "exec-1",
      stepId: "step-1",
      projectId: "proj-1",
      status: "pending",
      expiresAt: null,
      createdAt: new Date(),
      resolvedAt: null,
    });
  });

  it("returns approvedEdlUrl and no pause when mode is auto_approve", async () => {
    const ctx = { ...baseCtx, config: { mode: "auto_approve" } };
    const result = await executeReviewApprovalGate(ctx);
    expect("error" in result).toBe(false);
    expect("output" in result).toBe(true);
    if ("output" in result) {
      expect(result.output.approvedEdlUrl).toBe("https://example.com/edl.json");
    }
    expect("pauseForReview" in result).toBe(false);
    expect(prisma.reviewSession.upsert).not.toHaveBeenCalled();
  });

  it("returns error when projectId or edlUrl missing", async () => {
    const result = await executeReviewApprovalGate({
      ...baseCtx,
      inputData: { projectId: "p1" },
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("edlUrl");
  });

  it("returns pauseForReview and reviewSessionId when mode is manual_review", async () => {
    const ctx = { ...baseCtx, config: { mode: "manual_review" } };
    const result = await executeReviewApprovalGate(ctx);
    expect("error" in result).toBe(false);
    expect("pauseForReview" in result).toBe(true);
    expect((result as { pauseForReview: boolean; reviewSessionId: string }).pauseForReview).toBe(true);
    expect((result as { reviewSessionId: string }).reviewSessionId).toBe("session-1");
    expect(prisma.reviewSession.upsert).toHaveBeenCalledWith({
      where: { runId_stepId: { runId: "exec-1", stepId: "step-1" } },
      create: expect.objectContaining({ runId: "exec-1", stepId: "step-1", status: "pending" }),
      update: expect.any(Object),
    });
  });

  it("returns error when executionId missing in manual mode", async () => {
    const ctx = { ...baseCtx, config: { mode: "manual_review" }, executionId: undefined };
    const result = await executeReviewApprovalGate(ctx);
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("Execution context");
  });
});
