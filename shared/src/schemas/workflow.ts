import { z } from 'zod';

/** Node category (same as frontend). */
export const NodeCategorySchema = z.enum([
  'trigger',
  'ai',
  'voice',
  'video',
  'social',
  'logic',
  'utility',
  'review',
  'ideas',
  'text',
  'script',
]);
export type NodeCategory = z.infer<typeof NodeCategorySchema>;

/** Node status in workflow (same as frontend). */
export const NodeStatusSchema = z.enum([
  'idle',
  'running',
  'success',
  'error',
  'disabled',
  'waiting_review',
]);
export type NodeStatus = z.infer<typeof NodeStatusSchema>;

/** Workflow status. */
export const WorkflowStatusSchema = z.enum(['draft', 'active', 'archived']);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

/** Workflow list item (from GET /api/workflows). */
export const WorkflowListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  nodes: z.array(z.unknown()),
  edges: z.array(z.unknown()),
  lastCompletedRunLog: z.unknown().nullable().optional(),
  lastRunLog: z.unknown().nullable().optional(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowListItem = z.infer<typeof WorkflowListItemSchema>;

/** Execution list item (from GET /api/workflows/:id/executions). */
export const ExecutionListItemSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  status: z.string(),
  logs: z.unknown(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
});
export type ExecutionListItem = z.infer<typeof ExecutionListItemSchema>;
