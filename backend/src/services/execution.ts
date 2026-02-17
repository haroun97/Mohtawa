import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { executeNode, type ExecutorContext } from "../executors/index";
import { getDecryptedKey } from "./apiKeys";

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

interface StepLog {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  status: "idle" | "running" | "success" | "error";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
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

export async function executeWorkflow(workflowId: string, userId: string) {
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

  runExecution(execution.id, nodes, edges, userId).catch((err) => {
    console.error(`Execution ${execution.id} failed unexpectedly:`, err);
  });

  return formatExecution(execution);
}

async function runExecution(
  executionId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  userId: string,
) {
  const activeNodes = nodes.filter(
    (n) => n.data.status !== "disabled",
  );
  const sorted = topologicalSort(activeNodes, edges);
  const stepLogs: StepLog[] = sorted.map((n) => ({
    nodeId: n.id,
    nodeType: n.data.definition.type || n.type,
    nodeTitle: n.data.definition.title,
    status: "idle" as const,
  }));

  const nodeOutputs = new Map<string, Record<string, unknown>>();

  // Build a getApiKey function bound to this user
  const getApiKey = (service: string) => getDecryptedKey(userId, service);

  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i];

    stepLogs[i].status = "running";
    stepLogs[i].startedAt = new Date().toISOString();

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { logs: JSON.stringify(stepLogs) },
    });

    // Gather inputs from connected upstream nodes
    const incomingEdges = edges.filter((e) => e.target === node.id);
    const inputData: Record<string, unknown> = {};
    for (const edge of incomingEdges) {
      const upstream = nodeOutputs.get(edge.source);
      if (upstream) {
        inputData[edge.sourceHandle || "output"] = upstream;
      }
    }

    stepLogs[i].input = inputData;

    const start = Date.now();

    // Build executor context
    const ctx: ExecutorContext = {
      nodeId: node.id,
      nodeType: node.data.definition.type || node.type,
      category: node.data.definition.category,
      config: node.data.config || {},
      inputData,
      getApiKey,
    };

    // Execute the node using the real executor
    const result = await executeNode(ctx);
    const durationMs = Date.now() - start;

    if ("error" in result) {
      stepLogs[i].status = "error";
      stepLogs[i].error = result.error;
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
