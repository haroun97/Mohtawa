import type { ExecutorContext, ExecutorResult } from "./index.js";
import {
  forEachResultItemSchema,
  previewLoopOutputsSchema,
  type PreviewLoopAudioItem,
} from "../schemas/ideasLoopSchemas.js";

/**
 * preview.loop_outputs
 *
 * Utility node that aggregates per-item results from a preceding flow.for_each
 * node into a flat list of { id, title?, audioUrl? } so the UI can render a
 * simple playlist of loop-generated audio clips.
 *
 * Expected upstream shape (from For Each engine aggregation):
 * {
 *   results: Array<{
 *     itemId: string;
 *     outputsByNodeId?: Record<string, unknown>;
 *   }>;
 *   items?: Array<{ id: string; title?: string; idea?: string }>;
 * }
 */
export function executePreviewLoopOutputs(
  ctx: ExecutorContext,
): ExecutorResult {
  const { inputData } = ctx;

  // Heuristic: find the first upstream value that looks like a For Each output.
  const candidates = Object.values(inputData);
  const source =
    (candidates.find(
      (v) =>
        v &&
        typeof v === "object" &&
        ("results" in (v as Record<string, unknown>) ||
          "items" in (v as Record<string, unknown>)),
    ) as Record<string, unknown> | undefined) || {};

  const rawResults = Array.isArray((source as any).results)
    ? ((source as any).results as unknown[])
    : [];
  const rawItems = Array.isArray((source as any).items)
    ? ((source as any).items as Array<Record<string, unknown>>)
    : [];

  // Map idea items by id so we can grab a friendly title.
  const itemsById = new Map<string, Record<string, unknown>>();
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const id = "id" in item ? String(item.id) : undefined;
    if (!id) continue;
    itemsById.set(id, item);
  }

  const aggregated: PreviewLoopAudioItem[] = [];

  for (const entry of rawResults) {
    const parsed = forEachResultItemSchema.safeParse(entry);
    if (!parsed.success) continue;
    const result = parsed.data;

    const outputs = Object.values(result.outputsByNodeId ?? {}) as Array<
      Record<string, unknown>
    >;
    if (!outputs.length) continue;

    // Find any downstream node output that exposes an audioUrl (e.g. voice.tts).
    const withAudio = outputs.find(
      (o) => typeof o.audioUrl === "string" && !!o.audioUrl,
    ) as { audioUrl?: string; title?: string } | undefined;
    if (!withAudio?.audioUrl) continue;

    const itemMeta = itemsById.get(result.itemId);
    const title = ((): string | undefined => {
      if (withAudio.title && typeof withAudio.title === "string") {
        return withAudio.title;
      }
      if (itemMeta) {
        const maybeTitle = itemMeta.title ?? itemMeta.idea;
        if (typeof maybeTitle === "string" && maybeTitle.trim()) {
          return maybeTitle;
        }
      }
      return undefined;
    })();

    aggregated.push({
      id: result.itemId,
      title,
      audioUrl: withAudio.audioUrl,
    });
  }

  const validated = previewLoopOutputsSchema.safeParse({ items: aggregated });
  return validated.success
    ? { output: validated.data }
    : { output: { items: aggregated } };
}

