import { z } from 'zod';

/** Run-level status (aligns with frontend RunStatus and backend step status). */
export const RunStatusSchema = z.enum([
  'idle',
  'running',
  'success',
  'error',
  'waiting_review',
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

/** Per-iteration step log (node run inside a For Each loop). */
export const IterationStepLogSchema = z.object({
  nodeId: z.string(),
  nodeTitle: z.string(),
  status: z.string(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});
export type IterationStepLog = z.infer<typeof IterationStepLogSchema>;

/** Step log for a single node in a run. */
export const RunStepSchema = z.object({
  nodeId: z.string(),
  nodeTitle: z.string(),
  status: RunStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  reviewSessionId: z.string().optional(),
  iterationSteps: z
    .array(
      z.object({
        iteration: z.number(),
        itemId: z.string().optional(),
        itemTitle: z.string().optional(),
        steps: z.array(IterationStepLogSchema),
      })
    )
    .optional(),
});
export type RunStep = z.infer<typeof RunStepSchema>;

/** Full run log. */
export const RunLogSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: RunStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  steps: z.array(RunStepSchema),
});
export type RunLog = z.infer<typeof RunLogSchema>;
