import { describe, it, expect, vi, beforeEach } from "vitest";
import { decideIterationReviewAndResume, getReviewQueue } from "./execution";

vi.mock("../lib/prisma", () => ({
  prisma: {
    workflowExecution: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    runReviewDecision: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("./apiKeys", () => ({ getDecryptedKey: vi.fn().mockResolvedValue(null) }));
vi.mock("./voiceProfiles", () => ({
  getVoiceProfileForExecution: vi.fn().mockResolvedValue(null),
}));
vi.mock("../executors/index", () => ({
  executeNode: vi.fn().mockResolvedValue({
    output: { finalVideoUrl: "https://example.com/final.mp4" },
  }),
}));

const { prisma } = await import("../lib/prisma");

const baseExecution = {
  id: "run-1",
  workflowId: "wf-1",
  status: "WAITING_FOR_REVIEW",
  logs: JSON.stringify([
    { nodeId: "trigger", status: "success", output: {} },
    {
      nodeId: "for-each",
      status: "success",
      output: {
        results: [
          {
            itemId: "item-1",
            outputsByNodeId: {
              "review-node": {
                projectId: "proj-1",
                edlUrl: "https://example.com/edl.json",
                draftVideoUrl: "https://example.com/draft.mp4",
              },
            },
          },
        ],
        items: [{ id: "item-1", title: "Idea 1" }],
      },
      iterationSteps: [
        {
          iteration: 0,
          itemId: "item-1",
          itemTitle: "Idea 1",
          steps: [
            { nodeId: "review-node", nodeTitle: "Review", status: "waiting_review", output: { edlUrl: "https://example.com/edl.json" } },
          ],
        },
      ],
    },
  ]),
  startedAt: new Date(),
  completedAt: null,
  error: null,
  workflow: {
    userId: "user-1",
    nodes: JSON.stringify([
      { id: "trigger", data: { definition: { type: "trigger", category: "trigger" }, config: {}, status: "enabled" } },
      { id: "for-each", data: { definition: { type: "flow.for_each", category: "logic" }, config: {}, status: "enabled" } },
      { id: "review-node", data: { definition: { type: "review.approval_gate", category: "review" }, config: {}, status: "enabled" } },
      { id: "render-final", data: { definition: { type: "video.render_final", category: "video" }, config: {}, status: "enabled" } },
    ]),
    edges: JSON.stringify([
      { id: "e1", source: "trigger", target: "for-each" },
      { id: "e2", source: "for-each", target: "review-node" },
      { id: "e3", source: "review-node", target: "render-final" },
    ]),
  },
};

describe("decideIterationReviewAndResume", () => {
  beforeEach(() => {
    vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(baseExecution as any);
    vi.mocked(prisma.workflowExecution.update).mockResolvedValue({} as any);
    vi.mocked(prisma.runReviewDecision.findFirst).mockResolvedValue({
      id: "dec-1",
      runId: "run-1",
      iterationId: "item-1",
      nodeId: "review-node",
      decision: "pending",
      notes: null,
      edited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      decidedAt: null,
    } as any);
    vi.mocked(prisma.runReviewDecision.update).mockResolvedValue({} as any);
  });

  it("returns 404 when execution not found", async () => {
    vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(null);
    await expect(
      decideIterationReviewAndResume("run-1", "item-1", "user-1", { decision: "skipped" })
    ).rejects.toMatchObject({ statusCode: 404, message: "Execution not found" });
  });

  it("returns 403 when user does not own workflow", async () => {
    await expect(
      decideIterationReviewAndResume("run-1", "item-1", "other-user", { decision: "skipped" })
    ).rejects.toMatchObject({ statusCode: 403, message: "Access denied" });
  });

  it("returns 404 when no pending review decision for iteration", async () => {
    vi.mocked(prisma.runReviewDecision.findFirst).mockResolvedValue(null);
    await expect(
      decideIterationReviewAndResume("run-1", "item-1", "user-1", { decision: "approved" })
    ).rejects.toMatchObject({ statusCode: 404, message: /pending review decision/ });
  });

  it("updates decision to skipped and returns execution", async () => {
    const result = await decideIterationReviewAndResume("run-1", "item-1", "user-1", {
      decision: "skipped",
      notes: "Not needed",
    });
    expect(prisma.runReviewDecision.update).toHaveBeenCalledWith({
      where: { id: "dec-1" },
      data: expect.objectContaining({
        decision: "skipped",
        notes: "Not needed",
        decidedAt: expect.any(Date),
      }),
    });
    expect(result).toHaveProperty("id", "run-1");
    expect(result).toHaveProperty("status");
  });

  it("updates decision to approved and runs downstream for that iteration", async () => {
    const result = await decideIterationReviewAndResume("run-1", "item-1", "user-1", {
      decision: "approved",
    });
    expect(prisma.runReviewDecision.update).toHaveBeenCalledWith({
      where: { id: "dec-1" },
      data: expect.objectContaining({
        decision: "approved",
        decidedAt: expect.any(Date),
      }),
    });
    expect(prisma.workflowExecution.update).toHaveBeenCalled();
    const updateCall = vi.mocked(prisma.workflowExecution.update).mock.calls[0];
    const logs = JSON.parse(updateCall[0].data.logs);
    const forEachStep = logs.find((l: any) => l.iterationSteps != null);
    expect(forEachStep).toBeDefined();
    expect(forEachStep.output.results[0].outputsByNodeId["render-final"]).toEqual(
      expect.objectContaining({ finalVideoUrl: "https://example.com/final.mp4" })
    );
    expect(result).toHaveProperty("id", "run-1");
  });
});

describe("getReviewQueue", () => {
  const executionWithQueue = {
    id: "run-1",
    workflowId: "wf-1",
    status: "WAITING_FOR_REVIEW",
    startedAt: new Date("2026-03-05T12:00:00Z"),
    completedAt: null as Date | null,
    workflow: { userId: "user-1", name: "My Workflow" },
    logs: JSON.stringify([
      { nodeId: "trigger", status: "success" },
      {
        nodeId: "for-each",
        status: "success",
        output: {
          results: [
            {
              itemId: "item-1",
              outputsByNodeId: {
                "auto-edit": {
                  draftVideoUrl: "https://example.com/draft.mp4",
                  edlUrl: "https://example.com/edl.json",
                  projectId: "proj-1",
                },
                "voice": { audioUrl: "https://example.com/voice.mp3" },
              },
            },
            {
              itemId: "item-2",
              outputsByNodeId: {
                "auto-edit": { draftVideoUrl: "https://example.com/draft2.mp4", projectId: "proj-2" },
              },
            },
          ],
          items: [
            { id: "item-1", title: "Idea One" },
            { id: "item-2", title: "Idea Two" },
          ],
        },
        iterationSteps: [
          { iteration: 0, itemId: "item-1", itemTitle: "Idea One", steps: [{ nodeId: "review", status: "waiting_review" }] },
          { iteration: 1, itemId: "item-2", itemTitle: "Idea Two", steps: [{ nodeId: "review", status: "success" }] },
        ],
      },
    ]),
  };

  beforeEach(() => {
    vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(executionWithQueue as any);
    vi.mocked(prisma.runReviewDecision.findMany).mockResolvedValue([
      {
        id: "d1",
        runId: "run-1",
        iterationId: "item-2",
        nodeId: "review",
        decision: "approved",
        notes: null,
        edited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        decidedAt: new Date("2026-03-05T12:05:00Z"),
      },
    ] as any);
  });

  it("returns 404 when execution not found", async () => {
    vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue(null);
    await expect(getReviewQueue("run-1", "user-1")).rejects.toMatchObject({
      statusCode: 404,
      message: "Execution not found",
    });
  });

  it("returns 403 when user does not own workflow", async () => {
    await expect(getReviewQueue("run-1", "other-user")).rejects.toMatchObject({
      statusCode: 403,
      message: "Access denied",
    });
  });

  it("returns queue with items, URLs, and counts", async () => {
    const result = await getReviewQueue("run-1", "user-1");
    expect(result.runId).toBe("run-1");
    expect(result.runStatus).toBe("WAITING_FOR_REVIEW");
    expect(result.workflowName).toBe("My Workflow");
    expect(result.totalItems).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      iterationId: "item-1",
      itemIndex: 0,
      title: "Idea One",
      status: "needs_review",
      decision: null,
      draftVideoUrl: "https://example.com/draft.mp4",
      voiceoverUrl: "https://example.com/voice.mp3",
      finalVideoUrl: null,
    });
    expect(result.items[1]).toMatchObject({
      iterationId: "item-2",
      itemIndex: 1,
      title: "Idea Two",
      status: "approved",
      decision: "approved",
      draftVideoUrl: "https://example.com/draft2.mp4",
    });
    expect(result.counts).toEqual({ needsReview: 1, approved: 1, skipped: 0, rendered: 0, failed: 0 });
  });

  it("returns empty items when run has no For Each step", async () => {
    vi.mocked(prisma.workflowExecution.findUnique).mockResolvedValue({
      ...executionWithQueue,
      logs: JSON.stringify([{ nodeId: "trigger", status: "success" }]),
    } as any);
    const result = await getReviewQueue("run-1", "user-1");
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.counts).toEqual({ needsReview: 0, approved: 0, skipped: 0, rendered: 0, failed: 0 });
  });
});
