import { z } from 'zod';

/** Review queue item status (same as web and backend). */
export const ReviewQueueItemStatusSchema = z.enum([
  'needs_review',
  'approved',
  'skipped',
  'rendered',
  'failed',
]);
export type ReviewQueueItemStatus = z.infer<typeof ReviewQueueItemStatusSchema>;

/** Review decision (same as backend decide body). */
export const ReviewDecisionSchema = z.enum(['pending', 'approved', 'skipped']);
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

/** Single item in the review queue (mirrors frontend + backend). */
export const ReviewQueueItemSchema = z.object({
  iterationId: z.string(),
  itemIndex: z.number(),
  title: z.string(),
  status: ReviewQueueItemStatusSchema,
  decision: ReviewDecisionSchema.nullable(),
  draftVideoUrl: z.string().nullable(),
  voiceoverUrl: z.string().nullable(),
  finalVideoUrl: z.string().nullable(),
  projectId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  failedNodeTitle: z.string().nullable(),
  lastUpdatedAt: z.string(),
});
export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;

/** Response from GET /api/runs/:runId/review-queue. */
export const ReviewQueueResponseSchema = z.object({
  runId: z.string(),
  runStatus: z.string(),
  workflowName: z.string().optional(),
  totalItems: z.number(),
  items: z.array(ReviewQueueItemSchema),
  counts: z.object({
    needsReview: z.number(),
    approved: z.number(),
    skipped: z.number(),
    rendered: z.number(),
    failed: z.number(),
  }),
});
export type ReviewQueueResponse = z.infer<typeof ReviewQueueResponseSchema>;

/** Body for POST /api/runs/:runId/iterations/:iterationId/review/decide. */
export const ReviewDecideBodySchema = z.object({
  decision: z.enum(['approved', 'skipped']),
  notes: z.string().max(2000).optional(),
});
export type ReviewDecideBody = z.infer<typeof ReviewDecideBodySchema>;
