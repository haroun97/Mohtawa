import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { executeNode, type ExecutorContext } from "../executors/index";
import type { ExecutionJobData } from "../lib/queue.js";
import { getDecryptedKey } from "./apiKeys";
import { getVoiceProfileForExecution } from "./voiceProfiles";

interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    definition: {
      type: string;
      title: string;
      category: string;
      inputs: string[];
      outputs: string[];
    };
    config: Record<string, unknown>;
    status?: string;
  };
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Per-iteration step (node run inside a For Each loop). */
export interface IterationStepLog {
  nodeId: string;
  nodeTitle: string;
  status: "idle" | "running" | "success" | "error";
  output?: Record<string, unknown>;
  error?: string;
}

interface StepLog {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  status: "idle" | "running" | "success" | "error" | "waiting_review";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  errorStack?: string;
  reviewSessionId?: string;
  /** When this step is flow.for_each: one entry per iteration with child step logs. */
  iterationSteps?: Array<{
    iteration: number;
    itemTitle?: string;
    steps: IterationStepLog[];
  }>;
}

/** Persist last completed run log on the workflow so frontend can restore status/download when no completed run is in the list. */
async function persistLastCompletedRunLog(
  executionId: string,
  stepLogs: StepLog[],
  runStatus: "COMPLETED" | "FAILED",
): Promise<void> {
  const exec = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    select: { workflowId: true, startedAt: true, completedAt: true },
  });
  if (!exec) return;
  const runLog = {
    id: executionId,
    workflowId: exec.workflowId,
    status: runStatus === "COMPLETED" ? "success" : "error",
    startedAt: exec.startedAt.toISOString(),
    completedAt: exec.completedAt?.toISOString(),
    steps: stepLogs.map((l) => ({
      nodeId: l.nodeId,
      nodeTitle: l.nodeTitle,
      status: l.status,
      startedAt: l.startedAt,
      completedAt: l.completedAt,
      output: l.output,
      error: l.error,
      reviewSessionId: l.reviewSessionId,
      iterationSteps: l.iterationSteps,
    })),
  };
  await prisma.workflow.update({
    where: { id: exec.workflowId },
    data: {
      lastCompletedRunLog: JSON.stringify(runLog),
      lastRunLog: JSON.stringify(runLog),
    },
  });
}

/** Persist a pre-built run log to the workflow (e.g. after Test node that produces final video). */
async function persistWorkflowLastCompletedRunLog(
  workflowId: string,
  runLog: {
    id: string;
    workflowId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    steps: Array<{
      nodeId: string;
      nodeTitle: string;
      status: string;
      startedAt?: string;
      completedAt?: string;
      output?: Record<string, unknown>;
      error?: string;
      reviewSessionId?: string;
    }>;
  },
): Promise<void> {
  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      lastCompletedRunLog: JSON.stringify(runLog),
      lastRunLog: JSON.stringify(runLog),
    },
  });
}

function topologicalSort(
  nodes: NodeData[],
  edges: EdgeData[],
): NodeData[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  }

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjacency.get(e.source)?.push(e.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: NodeData[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const next of adjacency.get(id) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return sorted;
}

export interface ExecuteWorkflowOptions {
  /** When workflow has Ideas Source (In-app Editor), pass the selected doc from the client. */
  ideaDoc?: { title?: string; content: unknown };
}

export async function executeWorkflow(
  workflowId: string,
  userId: string,
  options: ExecuteWorkflowOptions = {},
) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.userId !== userId) throw new AppError(403, "Access denied");

  const nodes: NodeData[] = JSON.parse(workflow.nodes);
  const edges: EdgeData[] = JSON.parse(workflow.edges);

  if (nodes.length === 0) {
    throw new AppError(400, "Workflow has no nodes to execute");
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status: "RUNNING",
      logs: "[]",
    },
  });

  const { enqueueExecution } = await import("../lib/queue.js");
  const jobId = await enqueueExecution({
    executionId: execution.id,
    workflowId,
    userId,
    nodes: workflow.nodes,
    edges: workflow.edges,
    ideaDoc: options.ideaDoc,
  });

  if (jobId) {
    return formatExecution(execution);
  }

  runExecution(execution.id, nodes, edges, userId, {
    ideaDoc: options.ideaDoc,
  }).catch((err) => {
    console.error(`Execution ${execution.id} failed unexpectedly:`, err);
  });

  return formatExecution(execution);
}

export interface RunExecutionOptions {
  priorOutputs?: Record<string, Record<string, unknown>>;
  startFromStepIndex?: number;
  /** When rerunning: logs for steps before startFromStepIndex (to preserve success state). */
  previousLogs?: StepLog[];
  /** For Ideas Source (In-app Editor): doc from client. */
  ideaDoc?: { title?: string; content: unknown };
}

async function runExecution(
  executionId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  userId: string,
  options: RunExecutionOptions = {},
) {
  const {
    priorOutputs = {},
    startFromStepIndex = 0,
    previousLogs,
    ideaDoc,
  } = options;
  const activeNodes = nodes.filter(
    (n) => n.data.status !== "disabled",
  );
  const sorted = topologicalSort(activeNodes, edges);
  const stepLogs: StepLog[] = sorted.map((n, i) => {
    if (i < startFromStepIndex && previousLogs?.[i]) {
      return { ...previousLogs[i] };
    }
    return {
      nodeId: n.id,
      nodeType: n.data.definition.type || n.type,
      nodeTitle: n.data.definition.title,
      status: "idle" as const,
    };
  });

  const nodeOutputs = new Map<string, Record<string, unknown>>(
    Object.entries(priorOutputs),
  );

  if (startFromStepIndex > 0 && stepLogs.length > 0) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { logs: JSON.stringify(stepLogs) },
    });
  }

  // Build a getApiKey function bound to this user
  const getApiKey = (service: string) => getDecryptedKey(userId, service);
  const getVoiceProfile = (profileId: string) =>
    getVoiceProfileForExecution(profileId, userId);

  for (let i = startFromStepIndex; i < sorted.length; i++) {
    const node = sorted[i];
    const nodeType = node.data.definition.type || node.type;

    stepLogs[i].status = "running";
    stepLogs[i].startedAt = new Date().toISOString();

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { logs: JSON.stringify(stepLogs) },
    });

    // Scalable input: key by source node id so multiple upstreams never overwrite (each connection keeps its own key).
    const incomingEdges = edges.filter((e) => e.target === node.id);
    const inputData: Record<string, unknown> = {};
    for (const edge of incomingEdges) {
      const upstream = nodeOutputs.get(edge.source);
      if (upstream) {
        inputData[edge.source] = upstream;
      }
    }
    if (nodeType === "ideas.source") {
      const config = node.data.config || {};
      if (config.provider === "in_app_editor") {
        const { getIdeaDocForExecution } = await import("../services/ideaDocs.js");
        const docMode = (config.inAppEditorDocMode as string) || "single";
        if (docMode === "multi" && Array.isArray(config.ideaDocIds) && config.ideaDocIds.length > 0) {
          const docs = [];
          for (const id of config.ideaDocIds as unknown[]) {
            const docId = String(id);
            const fetched = await getIdeaDocForExecution(docId, userId);
            if (fetched) {
              docs.push({ id: docId, ...fetched });
            }
          }
          if (docs.length > 0) {
            inputData._ideaDocs = docs;
          } else if (ideaDoc) {
            inputData._ideaDoc = ideaDoc;
          }
        } else if (config.ideaDocId) {
          const fetched = await getIdeaDocForExecution(String(config.ideaDocId), userId);
          if (fetched) inputData._ideaDoc = fetched;
          else if (ideaDoc) inputData._ideaDoc = ideaDoc;
        } else if (ideaDoc) {
          inputData._ideaDoc = ideaDoc;
        }
      } else if (ideaDoc) {
        inputData._ideaDoc = ideaDoc;
      }
    }

    stepLogs[i].input = inputData;

    // For Each: run downstream nodes once per item and inject _item
    if (nodeType === "flow.for_each") {
      let items: unknown[] = [];
      for (const v of Object.values(inputData)) {
        if (v && typeof v === "object" && "items" in v && Array.isArray((v as { items: unknown[] }).items)) {
          items = (v as { items: unknown[] }).items;
          break;
        }
      }

      const forEachId = node.id;
      const downstreamStart = i + 1;
      const downstreamNodes = sorted.slice(downstreamStart);
      const iterationStepsLog: StepLog["iterationSteps"] = [];
      const results: Array<{ itemId: string; outputsByNodeId: Record<string, unknown> }> = [];
      let lastIterationOutputs = new Map<string, Record<string, unknown>>();

      for (let k = 0; k < items.length; k++) {
        const item = items[k] as Record<string, unknown> | undefined;
        const itemObj = item && typeof item === "object" ? item : {};
        const itemId = String(itemObj.id ?? `item-${k + 1}`);
        const itemTitle = String(itemObj.title ?? itemId);

        const iterOutputs = new Map<string, Record<string, unknown>>(nodeOutputs);
        iterOutputs.set(forEachId, { _item: itemObj });

        const iterSteps: IterationStepLog[] = [];

        for (let j = downstreamStart; j < sorted.length; j++) {
          const downNode = sorted[j];
          const downType = downNode.data.definition.type || downNode.type;
          // Run preview.loop_outputs once after the loop with aggregated results, not per iteration.
          if (downType === "preview.loop_outputs") {
            const placeholder = { items: [] as unknown[] };
            iterOutputs.set(downNode.id, placeholder);
            lastIterationOutputs.set(downNode.id, placeholder);
            iterSteps.push({
              nodeId: downNode.id,
              nodeTitle: downNode.data.definition.title,
              status: "success",
              output: placeholder,
            });
            continue;
          }
          // Key by source so multiple upstreams (e.g. Auto Edit + Preview Loop Outputs) don't overwrite.
          const downIncoming = edges.filter((e) => e.target === downNode.id);
          const downInput: Record<string, unknown> = {};
          for (const edge of downIncoming) {
            const src = edge.source;
            if (src === forEachId) {
              downInput._item = itemObj;
            } else {
              const up = iterOutputs.get(src);
              if (up) downInput[src] = up;
            }
          }

          const downCtx: ExecutorContext = {
            nodeId: downNode.id,
            nodeType: downType,
            category: downNode.data.definition.category,
            config: downNode.data.config || {},
            inputData: downInput,
            getApiKey,
            userId,
            getVoiceProfile,
            executionId,
            stepIndex: j,
          };

          const downResult = await executeNode(downCtx);
          if ("error" in downResult) {
            iterSteps.push({
              nodeId: downNode.id,
              nodeTitle: downNode.data.definition.title,
              status: "error",
              error: downResult.error,
            });
            lastIterationOutputs.set(downNode.id, { error: downResult.error });
            break;
          }
          const out = downResult.output as Record<string, unknown>;
          iterOutputs.set(downNode.id, out);
          lastIterationOutputs.set(downNode.id, out);
          iterSteps.push({
            nodeId: downNode.id,
            nodeTitle: downNode.data.definition.title,
            status: "success",
            output: out,
          });
        }

        results.push({
          itemId,
          outputsByNodeId: Object.fromEntries(lastIterationOutputs),
        });
        iterationStepsLog.push({
          iteration: k,
          itemTitle,
          steps: iterSteps,
        });
      }

      stepLogs[i].status = "success";
      stepLogs[i].output = { results, items };
      stepLogs[i].iterationSteps = iterationStepsLog;
      stepLogs[i].completedAt = new Date().toISOString();
      stepLogs[i].durationMs = 0;
      nodeOutputs.set(forEachId, { results, items });

      const forEachOutput = { results, items };

      for (let j = downstreamStart; j < sorted.length; j++) {
        const downNode = sorted[j];
        const downType = downNode.data.definition.type || downNode.type;
        if (downType === "preview.loop_outputs") {
          // Run once after the loop with aggregated For Each output.
          const ploCtx: ExecutorContext = {
            nodeId: downNode.id,
            nodeType: downType,
            category: downNode.data.definition.category,
            config: downNode.data.config || {},
            inputData: { output: forEachOutput },
            getApiKey,
            userId,
            getVoiceProfile,
            executionId,
            stepIndex: j,
          };
          const ploResult = await executeNode(ploCtx);
          const completedAt = new Date().toISOString();
          if ("error" in ploResult) {
            stepLogs[j].status = "error";
            stepLogs[j].error = ploResult.error;
            stepLogs[j].output = undefined;
            stepLogs[j].completedAt = completedAt;
            nodeOutputs.set(downNode.id, { error: ploResult.error });
          } else {
            const out = ploResult.output as Record<string, unknown>;
            stepLogs[j].status = "success";
            stepLogs[j].output = out;
            stepLogs[j].completedAt = completedAt;
            nodeOutputs.set(downNode.id, out);
          }
          continue;
        }
        const out = lastIterationOutputs.get(downNode.id);
        stepLogs[j].status = out && !("error" in out) ? "success" : "error";
        stepLogs[j].output = out;
        stepLogs[j].completedAt = new Date().toISOString();
        if (out) nodeOutputs.set(downNode.id, out);
      }

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { logs: JSON.stringify(stepLogs) },
      });

      i = sorted.length - 1;
      continue;
    }

    const start = Date.now();

    // Build executor context
    const ctx: ExecutorContext = {
      nodeId: node.id,
      nodeType: node.data.definition.type || node.type,
      category: node.data.definition.category,
      config: node.data.config || {},
      inputData,
      getApiKey,
      userId,
      getVoiceProfile,
      executionId,
      stepIndex: i,
    };

    // Execute the node using the real executor
    const result = await executeNode(ctx);
    const durationMs = Date.now() - start;

    // Pause for human review (approval gate)
    if ("pauseForReview" in result && result.pauseForReview && "reviewSessionId" in result) {
      stepLogs[i].status = "waiting_review";
      stepLogs[i].output = result.output;
      stepLogs[i].completedAt = new Date().toISOString();
      stepLogs[i].durationMs = durationMs;
      stepLogs[i].reviewSessionId = result.reviewSessionId;
      nodeOutputs.set(node.id, result.output);

      const exec = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        select: { workflowId: true, startedAt: true },
      });
      const runLogForUi = exec
        ? {
            id: executionId,
            workflowId: exec.workflowId,
            status: "waiting_review" as const,
            startedAt: exec.startedAt.toISOString(),
            completedAt: undefined as string | undefined,
            steps: stepLogs.map((l) => ({
              nodeId: l.nodeId,
              nodeTitle: l.nodeTitle,
              status: l.status,
              startedAt: l.startedAt,
              completedAt: l.completedAt,
              output: l.output,
              error: l.error,
              reviewSessionId: l.reviewSessionId,
            })),
          }
        : null;

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: "WAITING_FOR_REVIEW",
          logs: JSON.stringify(stepLogs),
        },
      });
      if (runLogForUi && exec) {
        await prisma.workflow.update({
          where: { id: exec.workflowId },
          data: { lastRunLog: JSON.stringify(runLogForUi) },
        });
      }
      return; // stop execution until resolve-review
    }

    if ("error" in result) {
      stepLogs[i].status = "error";
      stepLogs[i].error = result.error;
      stepLogs[i].errorStack =
        "errorStack" in result ? String(result.errorStack) : undefined;
      stepLogs[i].completedAt = new Date().toISOString();
      stepLogs[i].durationMs = durationMs;

      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          logs: JSON.stringify(stepLogs),
          completedAt: new Date(),
          error: result.error,
        },
      });
      await persistLastCompletedRunLog(executionId, stepLogs, "FAILED");
      return;
    }

    // For conditional nodes, determine which downstream branch to follow
    if (ctx.nodeType === "if-else" && result.output.branch) {
      const branch = String(result.output.branch);
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      for (const edge of outgoingEdges) {
        if (edge.sourceHandle && edge.sourceHandle !== branch) {
          // Mark nodes in the skipped branch by not storing output for them
          // The downstream node won't find input data and will be skipped
        }
      }
    }

    stepLogs[i].status = "success";
    stepLogs[i].output = result.output;
    stepLogs[i].completedAt = new Date().toISOString();
    stepLogs[i].durationMs = durationMs;
    nodeOutputs.set(node.id, result.output);

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { logs: JSON.stringify(stepLogs) },
    });
  }

  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: "COMPLETED",
      logs: JSON.stringify(stepLogs),
      completedAt: new Date(),
    },
  });
  await persistLastCompletedRunLog(executionId, stepLogs, "COMPLETED");
}

/** Called by BullMQ worker: parse job data and run execution. */
export async function runExecutionFromJob(data: ExecutionJobData): Promise<void> {
  const nodes: NodeData[] = JSON.parse(data.nodes);
  const edges: EdgeData[] = JSON.parse(data.edges);
  const previousLogs = data.previousLogs as StepLog[] | undefined;
  await runExecutionInternal(data.executionId, nodes, edges, data.userId, {
    priorOutputs: data.priorOutputs,
    startFromStepIndex: data.startFromStepIndex ?? 0,
    previousLogs,
    ideaDoc: data.ideaDoc,
  });
}

async function runExecutionInternal(
  executionId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  userId: string,
  options: RunExecutionOptions = {},
): Promise<void> {
  return runExecution(executionId, nodes, edges, userId, options);
}

export async function rerunWorkflowFromFailed(
  workflowId: string,
  failedExecutionId: string,
  userId: string,
) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.userId !== userId) throw new AppError(403, "Access denied");

  const failedExecution = await prisma.workflowExecution.findUnique({
    where: { id: failedExecutionId },
  });
  if (!failedExecution) throw new AppError(404, "Execution not found");
  if (failedExecution.workflowId !== workflowId) {
    throw new AppError(400, "Execution does not belong to this workflow");
  }
  if (failedExecution.status !== "FAILED") {
    throw new AppError(400, "Execution did not fail. Only failed executions can be rerun from failed node.");
  }

  const logs: StepLog[] = JSON.parse(failedExecution.logs);
  const failedIndex = logs.findIndex((s) => s.status === "error");
  if (failedIndex < 0) {
    throw new AppError(400, "No failed step found in this execution.");
  }

  const priorOutputs: Record<string, Record<string, unknown>> = {};
  for (let i = 0; i < failedIndex; i++) {
    const log = logs[i];
    if (log.output && log.nodeId) priorOutputs[log.nodeId] = log.output;
  }
  const previousLogs = logs.slice(0, failedIndex);

  const nodes: NodeData[] = JSON.parse(workflow.nodes);
  const edges: EdgeData[] = JSON.parse(workflow.edges);
  const activeNodes = nodes.filter((n) => n.data.status !== "disabled");
  const sorted = topologicalSort(activeNodes, edges);
  if (failedIndex >= sorted.length) {
    throw new AppError(400, "Failed step index out of range.");
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      status: "RUNNING",
      logs: "[]",
    },
  });

  const jobData = {
    executionId: execution.id,
    workflowId,
    userId,
    nodes: workflow.nodes,
    edges: workflow.edges,
    priorOutputs,
    startFromStepIndex: failedIndex,
    previousLogs,
  };

  const { enqueueExecution } = await import("../lib/queue.js");
  const jobId = await enqueueExecution(jobData);

  if (jobId) {
    return formatExecution(execution);
  }

  runExecution(execution.id, nodes, edges, userId, {
    priorOutputs,
    startFromStepIndex: failedIndex,
    previousLogs,
  }).catch((err) => {
    console.error(`Rerun ${execution.id} failed:`, err);
  });

  return formatExecution(execution);
}

export async function getExecution(
  executionId: string,
  userId: string,
) {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: { select: { userId: true } } },
  });

  if (!execution) throw new AppError(404, "Execution not found");
  if (execution.workflow.userId !== userId)
    throw new AppError(403, "Access denied");

  return formatExecution(execution);
}

/** Result of running a single node (for Test Node). Step log shape matches execution logs. */
export interface SingleNodeResult {
  stepLog: {
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
    status: "success" | "error" | "waiting_review";
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    reviewSessionId?: string;
  };
}

/**
 * Run only one node. Uses optional prior execution to fill upstream inputs; otherwise runs with config-only.
 * Does not create or update any workflow execution — existing run state is unchanged.
 */
export async function executeSingleNode(
  workflowId: string,
  nodeId: string,
  userId: string,
  priorExecutionId?: string,
): Promise<SingleNodeResult> {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.userId !== userId) throw new AppError(403, "Access denied");

  const nodes: NodeData[] = JSON.parse(workflow.nodes);
  const edges: EdgeData[] = JSON.parse(workflow.edges);
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) throw new AppError(404, "Node not found");
  if (node.data?.status === "disabled") {
    throw new AppError(400, "Node is disabled");
  }

  let priorOutputs: Record<string, Record<string, unknown>> = {};
  if (priorExecutionId) {
    const prior = await prisma.workflowExecution.findUnique({
      where: { id: priorExecutionId },
      include: { workflow: { select: { userId: true } } },
    });
    if (prior && prior.workflow.userId === userId && prior.workflowId === workflowId) {
      const logs: StepLog[] = JSON.parse(prior.logs);
      for (const log of logs) {
        if (log.status === "success" && log.output && log.nodeId) {
          priorOutputs[log.nodeId] = log.output;
        }
      }
    }
  }

  // Key by source (scalable: multiple upstreams keep separate keys).
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const inputData: Record<string, unknown> = {};
  for (const edge of incomingEdges) {
    const upstream = priorOutputs[edge.source];
    if (upstream) {
      inputData[edge.source] = upstream;
    }
  }

  const getApiKey = (service: string) => getDecryptedKey(userId, service);
  const getVoiceProfile = (profileId: string) =>
    getVoiceProfileForExecution(profileId, userId);

  const startedAt = new Date().toISOString();
  const ctx: ExecutorContext = {
    nodeId: node.id,
    nodeType: node.data.definition?.type || node.type,
    category: node.data.definition?.category || "utility",
    config: (node.data?.config as Record<string, unknown>) || {},
    inputData,
    getApiKey,
    userId,
    getVoiceProfile,
    executionId: "test-single",
    stepIndex: 0,
  };

  const start = Date.now();
  const result = await executeNode(ctx);
  const durationMs = Date.now() - start;
  const completedAt = new Date().toISOString();

  if ("pauseForReview" in result && result.pauseForReview && "reviewSessionId" in result) {
    return {
      stepLog: {
        nodeId: node.id,
        nodeType: ctx.nodeType,
        nodeTitle: node.data.definition?.title || "Node",
        status: "waiting_review",
        startedAt,
        completedAt,
        durationMs,
        output: result.output,
        reviewSessionId: result.reviewSessionId,
      },
    };
  }

  if ("error" in result) {
    return {
      stepLog: {
        nodeId: node.id,
        nodeType: ctx.nodeType,
        nodeTitle: node.data.definition?.title || "Node",
        status: "error",
        startedAt,
        completedAt,
        durationMs,
        error: result.error,
      },
    };
  }

  const stepLog: StepLog = {
    nodeId: node.id,
    nodeType: ctx.nodeType,
    nodeTitle: node.data.definition?.title || "Node",
    status: "success",
    startedAt,
    completedAt,
    durationMs,
    output: result.output,
  };

  const hasFinalVideo =
    result.output &&
    typeof (result.output as Record<string, unknown>).finalVideoUrl === "string";

  if (priorExecutionId) {
    const prior = await prisma.workflowExecution.findUnique({
      where: { id: priorExecutionId },
      select: { id: true, workflowId: true, startedAt: true, logs: true },
    });
    if (prior && prior.workflowId === workflowId) {
      const logs: StepLog[] = JSON.parse(prior.logs);
      const merged = logs.some((l) => l.nodeId === nodeId)
        ? logs.map((l) => (l.nodeId === nodeId ? stepLog : l))
        : [...logs, stepLog];
      const runLog = {
        id: prior.id,
        workflowId: prior.workflowId,
        status: "success",
        startedAt: prior.startedAt.toISOString(),
        completedAt: completedAt ?? undefined,
        steps: merged.map((l) => ({
          nodeId: l.nodeId,
          nodeTitle: l.nodeTitle,
          status: l.status,
          startedAt: l.startedAt,
          completedAt: l.completedAt,
          output: l.output,
          error: l.error,
          reviewSessionId: l.reviewSessionId,
        })),
      };
      await persistWorkflowLastCompletedRunLog(workflowId, runLog);
    }
  } else if (hasFinalVideo) {
    const runLog = {
      id: "test-single",
      workflowId,
      status: "success",
      startedAt,
      completedAt: completedAt ?? undefined,
      steps: [
        {
          nodeId: stepLog.nodeId,
          nodeTitle: stepLog.nodeTitle,
          status: stepLog.status,
          startedAt: stepLog.startedAt,
          completedAt: stepLog.completedAt,
          output: stepLog.output,
          error: stepLog.error,
          reviewSessionId: stepLog.reviewSessionId,
        },
      ],
    };
    await persistWorkflowLastCompletedRunLog(workflowId, runLog);
  }

  return { stepLog: stepLog as SingleNodeResult["stepLog"] };
}

export async function listExecutions(
  workflowId: string,
  userId: string,
) {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) throw new AppError(404, "Workflow not found");
  if (workflow.userId !== userId) throw new AppError(403, "Access denied");

  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return executions.map(formatExecution);
}

function formatExecution(exec: {
  id: string;
  workflowId: string;
  status: string;
  logs: string;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}) {
  return {
    id: exec.id,
    workflowId: exec.workflowId,
    status: exec.status,
    logs: JSON.parse(exec.logs),
    startedAt: exec.startedAt.toISOString(),
    completedAt: exec.completedAt?.toISOString() || null,
    error: exec.error,
  };
}

/** Resolve a review gate (approve or edit) and resume execution. */
export async function resolveReviewAndResume(
  workflowId: string,
  executionId: string,
  stepId: string,
  userId: string,
  params: { action: "approve" | "edit"; approvedEdl?: unknown },
) {
  const { prisma: prismaClient } = await import("../lib/prisma.js");
  const execution = await prismaClient.workflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: { select: { userId: true, nodes: true, edges: true } } },
  });
  if (!execution) throw new AppError(404, "Execution not found");
  if (execution.workflow.userId !== userId) throw new AppError(403, "Access denied");
  if (execution.status !== "WAITING_FOR_REVIEW") {
    throw new AppError(400, "Execution is not waiting for review.");
  }

  const session = await prismaClient.reviewSession.findFirst({
    where: { runId: executionId, stepId, status: "pending" },
  });
  if (!session) throw new AppError(404, "Review session not found or already resolved.");

  const logs: StepLog[] = JSON.parse(execution.logs);
  const stepIndex = logs.findIndex((l) => l.nodeId === stepId);
  if (stepIndex < 0) throw new AppError(400, "Step not found in execution logs.");
  const stepOutput = logs[stepIndex].output as Record<string, unknown> | undefined;
  if (!stepOutput) throw new AppError(400, "Step has no output.");

  let approvedEdlUrl: string;
  if (params.action === "approve") {
    approvedEdlUrl = String(stepOutput.edlUrl ?? stepOutput.approvedEdlUrl ?? "");
    if (!approvedEdlUrl) throw new AppError(400, "No EDL URL to approve.");
  } else {
    if (!params.approvedEdl) throw new AppError(400, "approvedEdl required for edit.");
    const { validateEDL } = await import("../edl/schema.js");
    const { uploadJsonToS3, generateStorageKey, VIDEO_PREFIX } = await import("../lib/storage.js");
    const edl = validateEDL(params.approvedEdl);
    const key = generateStorageKey(userId, "edl_approved", "json");
    const upload = await uploadJsonToS3(key, edl, VIDEO_PREFIX);
    approvedEdlUrl = upload.url;
  }

  logs[stepIndex].output = { ...stepOutput, approvedEdlUrl };
  logs[stepIndex].status = "success";

  await prismaClient.reviewSession.update({
    where: { id: session.id },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  const priorOutputs: Record<string, Record<string, unknown>> = {};
  for (let j = 0; j <= stepIndex; j++) {
    const log = logs[j];
    if (log.output && log.nodeId) priorOutputs[log.nodeId] = log.output;
  }
  const previousLogs = logs.slice(0, stepIndex + 1);

  const nodes: NodeData[] = JSON.parse(execution.workflow.nodes);
  const edges: EdgeData[] = JSON.parse(execution.workflow.edges);

  await prismaClient.workflowExecution.update({
    where: { id: executionId },
    data: { status: "RUNNING", logs: JSON.stringify(logs) },
  });

  const { enqueueExecution } = await import("../lib/queue.js");
  const jobId = await enqueueExecution({
    executionId,
    workflowId,
    userId,
    nodes: execution.workflow.nodes,
    edges: execution.workflow.edges,
    priorOutputs,
    startFromStepIndex: stepIndex + 1,
    previousLogs,
  });

  if (jobId) {
    return getExecution(executionId, userId);
  }

  await runExecution(executionId, nodes, edges, userId, {
    priorOutputs,
    startFromStepIndex: stepIndex + 1,
    previousLogs,
  });
  return getExecution(executionId, userId);
}
