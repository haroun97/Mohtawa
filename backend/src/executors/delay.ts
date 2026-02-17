import type { ExecutorResult } from "./index";

export async function executeDelay(
  config: Record<string, unknown>,
): Promise<ExecutorResult> {
  const durationSeconds = Math.min(Number(config.duration || 5), 300); // cap at 5 minutes
  const startedAt = new Date().toISOString();

  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));

  return {
    output: {
      delayed: true,
      durationSeconds,
      startedAt,
      completedAt: new Date().toISOString(),
    },
  };
}
