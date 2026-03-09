import { z } from 'zod';

/** EDL event placeholder (extend as needed). */
export const EdlEventSchema = z.object({
  id: z.string(),
  in: z.number(),
  out: z.number(),
  source: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});
export type EdlEvent = z.infer<typeof EdlEventSchema>;

/** EDL document placeholder. */
export const EdlSchema = z.object({
  version: z.number().optional(),
  events: z.array(EdlEventSchema).default([]),
});
export type Edl = z.infer<typeof EdlSchema>;
