import type { RunLog, RunStep } from '@/types/workflow';

export interface DisplayFromIteration {
  output: Record<string, unknown> | undefined;
  status: string;
  error?: string;
}

/**
 * When the run has a For Each step with iterationSteps, derive display output and status
 * for a loop-internal node (e.g. Auto Edit, Review) so the node card shows the right state
 * after reload. Prefers the last iteration that has a successful step (so status dot and
 * draft video reflect success when any iteration succeeded); otherwise uses the last
 * iteration's step (so error state is shown when all failed).
 */
export function getDisplayFromIterationSteps(
  runLog: RunLog | null,
  nodeId: string
): DisplayFromIteration | null {
  if (!runLog?.steps?.length) return null;
  const forEachStep = runLog.steps.find(
    (s: RunStep) => (s.iterationSteps?.length ?? 0) > 0
  );
  if (!forEachStep?.iterationSteps?.length) return null;

  const iters = forEachStep.iterationSteps!;
  let lastIterStep: { output?: Record<string, unknown>; status: string; error?: string } | null = null;
  let lastSuccess: { output: Record<string, unknown> | undefined; status: string; error?: string } | null = null;

  for (let i = iters.length - 1; i >= 0; i--) {
    const step = iters[i].steps.find((st) => st.nodeId === nodeId);
    if (!step) continue;
    if (!lastIterStep) lastIterStep = { output: step.output, status: step.status, error: step.error };
    if (step.status === 'success') {
      lastSuccess = {
        output: step.output as Record<string, unknown> | undefined,
        status: step.status,
        error: step.error,
      };
      break;
    }
  }

  if (lastSuccess) return lastSuccess;
  if (lastIterStep)
    return {
      output: lastIterStep.output,
      status: lastIterStep.status,
      error: lastIterStep.error,
    };
  return null;
}
