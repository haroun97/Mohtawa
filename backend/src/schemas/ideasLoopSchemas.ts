/**
 * Zod schemas for Phase 7b Ideas List + Loop nodes:
 * ideas.source, text.split_items, flow.for_each
 */

import { z } from "zod";

// ─── Shared item shape (output of ideas.source and text.split_items) ─────

export const ideaItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  idea: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type IdeaItem = z.infer<typeof ideaItemSchema>;

export const itemsOutputSchema = z.object({
  items: z.array(ideaItemSchema),
});

export type ItemsOutput = z.infer<typeof itemsOutputSchema>;

// ─── ideas.source config ─────────────────────────────────────────────────

export const ideasSourceConfigSchema = z.object({
  provider: z.enum(["manual", "csv", "in_app_editor", "notion", "google_docs"]).default("manual"),
  manualItems: z.string().optional(),
  csvColumn: z.string().optional(),
  /** In-app Editor: split by H2 headings or by divider (horizontalRule). */
  inAppEditorSplitMode: z.enum(["headings", "divider"]).optional(),
  /**
   * In-app Editor: document mode.
   * - "single" (default): use one document (ideaDocId) and split into many items.
   * - "multi": use multiple documents (ideaDocIds) and emit one item per document.
   */
  inAppEditorDocMode: z.enum(["single", "multi"]).optional(),
  /** In-app Editor: selected document id (from GET /idea-docs). When set, backend fetches doc by id. */
  ideaDocId: z.string().optional(),
  /** In-app Editor: selected document ids when in multi-doc mode. */
  ideaDocIds: z.array(z.string()).optional(),
  // Notion (Phase 1): databaseId, pageId, filter, etc.
  notionDatabaseId: z.string().optional(),
  notionPageId: z.string().optional(),
  notionStatusFilter: z.string().optional(),
  // Google Docs (Phase 2): docId, etc.
  googleDocId: z.string().optional(),
});

export type IdeasSourceConfig = z.infer<typeof ideasSourceConfigSchema>;

// ─── text.split_items config ─────────────────────────────────────────────

export const splitModeSchema = z.enum(["headings", "bullets", "separator"]);
export type SplitMode = z.infer<typeof splitModeSchema>;

export const splitItemsConfigSchema = z.object({
  splitMode: splitModeSchema.default("headings"),
  separator: z.string().optional(),
});

export type SplitItemsConfig = z.infer<typeof splitItemsConfigSchema>;

// ─── flow.for_each config & output ────────────────────────────────────────

export const forEachConfigSchema = z.object({
  mode: z.enum(["sequential", "parallel"]).default("sequential"),
});

export type ForEachConfig = z.infer<typeof forEachConfigSchema>;

export const forEachResultItemSchema = z.object({
  itemId: z.string(),
  outputsByNodeId: z.record(z.string(), z.unknown()).optional(),
  finalVideoUrl: z.string().optional().nullable(),
});

export const forEachOutputSchema = z.object({
  results: z.array(forEachResultItemSchema),
});

export type ForEachOutput = z.infer<typeof forEachOutputSchema>;

// Iteration context passed to downstream nodes when engine runs per-item
export const iterationContextSchema = z.object({
  item: ideaItemSchema,
  index: z.number().int().min(0),
  total: z.number().int().min(1),
});

export type IterationContext = z.infer<typeof iterationContextSchema>;

// ─── script.write config & output ────────────────────────────────────────

export const writeScriptConfigSchema = z.object({
  mode: z.enum(["pass_through", "manual"]).default("pass_through"),
  scriptOverride: z.string().optional(),
});

export type WriteScriptConfig = z.infer<typeof writeScriptConfigSchema>;

export const writeScriptOutputSchema = z.object({
  title: z.string(),
  idea: z.string(),
  script: z.string(),
  text: z.string().optional(), // alias for Voice node compatibility
  language: z.string().optional(),
  style: z.string().optional(),
  captions: z.boolean().optional(),
});

export type WriteScriptOutput = z.infer<typeof writeScriptOutputSchema>;

// ─── preview.loop_outputs output (aggregated audio list) ──────────────────

export const previewLoopAudioItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  audioUrl: z.string().url().optional(),
});

export type PreviewLoopAudioItem = z.infer<typeof previewLoopAudioItemSchema>;

export const previewLoopOutputsSchema = z.object({
  items: z.array(previewLoopAudioItemSchema),
});

export type PreviewLoopOutputs = z.infer<typeof previewLoopOutputsSchema>;
