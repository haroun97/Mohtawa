/**
 * EDL (Edit Decision List) JSON schema and Zod validation.
 * Used by video.auto_edit and video.render_final.
 * Phase 7a: optional id, color, stylePreset, musicEnabled/Volumes (backward compatible).
 */

import { z } from "zod";

/** Accept http(s) and s3:// URLs */
const urlOrS3 = z.string().min(1);

export const timelineClipSchema = z.object({
  id: z.string().optional(),
  clipUrl: urlOrS3,
  inSec: z.number().min(0),
  outSec: z.number().min(0),
  startSec: z.number().min(0),
});

export const textOverlaySchema = z.object({
  id: z.string().optional(),
  type: z.literal("text"),
  text: z.string(),
  startSec: z.number().min(0),
  endSec: z.number().min(0),
  position: z.enum(["top", "center", "bottom"]).optional().default("bottom"),
  style: z.string().optional(),
  stylePreset: z.string().optional(),
});

export const overlaySchema = z.discriminatedUnion("type", [
  textOverlaySchema,
]);

export const audioSchema = z.object({
  voiceoverUrl: z.string(),
  musicUrl: z.string().optional(),
  voiceGainDb: z.number().optional(),
  musicGainDb: z.number().optional(),
  musicEnabled: z.boolean().optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  voiceVolume: z.number().min(0).max(1).optional(),
});

export const colorSchema = z.object({
  saturation: z.number().min(0).optional(),
  contrast: z.number().min(0).optional(),
  vibrance: z.number().min(0).optional(),
}).optional();

export const outputSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive().default(30),
});

export const edlSchema = z.object({
  timeline: z.array(timelineClipSchema),
  overlays: z.array(overlaySchema).default([]),
  audio: audioSchema,
  color: colorSchema,
  output: outputSchema,
});

export type TimelineClip = z.infer<typeof timelineClipSchema>;
export type TextOverlay = z.infer<typeof textOverlaySchema>;
export type Overlay = z.infer<typeof overlaySchema>;
export type EdlAudio = z.infer<typeof audioSchema>;
export type EdlColor = z.infer<typeof colorSchema>;
export type EdlOutput = z.infer<typeof outputSchema>;
export type EDL = z.infer<typeof edlSchema>;

export function validateEDL(data: unknown): EDL {
  return edlSchema.parse(data);
}

export function parseEDLSafe(data: unknown): { success: true; edl: EDL } | { success: false; error: string } {
  const result = edlSchema.safeParse(data);
  if (result.success) return { success: true, edl: result.data };
  return { success: false, error: result.error.message };
}
