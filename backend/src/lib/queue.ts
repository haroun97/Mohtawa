/**
 * Workflow execution queue. When REDIS_URL is set, jobs run via BullMQ worker.
 * Otherwise execution runs in-process (dev-friendly).
 */

import { Queue, Worker, type Job } from "bullmq";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "workflow-execution";

export interface ExecutionJobData {
  executionId: string;
  workflowId: string;
  userId: string;
  nodes: string;
  edges: string;
  /** When rerunning from failed: pre-seeded outputs from previous run (nodeId -> output). */
  priorOutputs?: Record<string, Record<string, unknown>>;
  /** Start from this step index (for rerun from failed). */
  startFromStepIndex?: number;
  /** When rerunning: step logs for steps before startFromStepIndex. */
  previousLogs?: Array<{
    nodeId: string;
    nodeType: string;
    nodeTitle: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    errorStack?: string;
  }>;
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

let queue: Queue<ExecutionJobData> | null = null;
let worker: Worker<ExecutionJobData> | null = null;

export function getQueue(): Queue<ExecutionJobData> | null {
  if (!REDIS_URL) return null;
  if (!queue) {
    const conn = getConnectionOptions();
    if (!conn) return null;
    queue = new Queue(QUEUE_NAME, {
      connection: conn,
      defaultJobOptions: {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
      },
    });
  }
  return queue;
}

/**
 * Add execution to queue. If Redis is not configured, returns null and caller should run in-process.
 */
export async function enqueueExecution(
  data: ExecutionJobData,
): Promise<string | null> {
  const q = getQueue();
  if (!q) return null;
  const job = await q.add("run", data, { jobId: data.executionId });
  return job.id ?? null;
}

/**
 * Register the worker that processes execution jobs. Call once at app startup when REDIS_URL is set.
 */
export function registerExecutionWorker(
  processor: (data: ExecutionJobData) => Promise<void>,
): void {
  if (!REDIS_URL || worker) return;
  const conn = getConnectionOptions();
  if (!conn) return;
  worker = new Worker(
    QUEUE_NAME,
    async (job: Job<ExecutionJobData>) => {
      await processor(job.data);
    },
    {
      connection: conn,
      concurrency: 5,
    },
  );
  worker.on("failed", (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed:`, err?.message);
  });
}

export function isQueueAvailable(): boolean {
  return !!REDIS_URL;
}
