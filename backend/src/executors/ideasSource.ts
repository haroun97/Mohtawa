import type { ExecutorContext, ExecutorResult } from "./index.js";
import {
  ideasSourceConfigSchema,
  ideaItemSchema,
  type IdeaItem,
} from "../schemas/ideasLoopSchemas.js";
import { tiptapDocToItems } from "../lib/tiptapDocToItems.js";

function parseManualItems(raw: string): IdeaItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Try JSON array first
  const firstChar = trimmed.charAt(0);
  if (firstChar === "[" && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown[];
      return parsed
        .map((entry, i) => {
          if (entry && typeof entry === "object" && "idea" in entry) {
            const o = entry as Record<string, unknown>;
            return {
              id: String(o.id ?? `item-${i + 1}`),
              title: String(o.title ?? o.idea ?? "").slice(0, 200),
              idea: String(o.idea ?? ""),
              meta: typeof o.meta === "object" && o.meta ? (o.meta as Record<string, unknown>) : undefined,
            };
          }
          if (typeof entry === "string") {
            return { id: `item-${i + 1}`, title: entry.slice(0, 100), idea: entry };
          }
          return null;
        })
        .filter((x): x is IdeaItem => x !== null);
    } catch {
      // fall through to line-by-line
    }
  }

  // One idea per line
  const lines = trimmed.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return lines.map((line, i) => ({
    id: `item-${i + 1}`,
    title: line.slice(0, 100),
    idea: line,
  }));
}

export function executeIdeasSource(ctx: ExecutorContext): ExecutorResult {
  const parsed = ideasSourceConfigSchema.safeParse(ctx.config);
  const config = parsed.success ? parsed.data : { provider: "manual" as const, manualItems: "" };

  if (config.provider === "csv") {
    // CSV mode: user pastes CSV in manualItems; csvColumn selects which column is the idea text
    const raw = String(ctx.config.manualItems ?? "").trim();
    if (!raw) return { output: { items: [] } };
    const lines = raw.split(/\r?\n/);
    const header = lines[0]?.toLowerCase().split(",").map((s) => s.trim()) ?? [];
    const col = (ctx.config.csvColumn as string)?.toLowerCase().trim() || header[0] || "idea";
    const colIndex = header.indexOf(col);
    const items: IdeaItem[] = lines.slice(1).map((line, i) => {
      const values = line.split(",").map((s) => s.trim());
      const idea = colIndex >= 0 ? values[colIndex] ?? "" : values[0] ?? "";
      return {
        id: `csv-${i + 1}`,
        title: idea.slice(0, 100),
        idea,
      };
    });
    return { output: { items } };
  }

  if (config.provider === "notion") {
    // TODO: Notion database/page integration
    return { output: { items: [], _stub: "Notion integration coming soon" } };
  }

  if (config.provider === "google_docs") {
    // TODO: Google Docs integration
    return { output: { items: [], _stub: "Google Docs integration coming soon" } };
  }

  if (config.provider === "in_app_editor") {
    const docMode = (ctx.config.inAppEditorDocMode as "single" | "multi") || "single";
    const splitMode = (ctx.config.inAppEditorSplitMode as "headings" | "divider") || "headings";

    if (docMode === "multi") {
      const docs = ctx.inputData._ideaDocs as Array<{ id?: string; title?: string; content?: unknown }> | undefined;
      if (!docs || docs.length === 0) {
        return {
          output: {
            items: [],
            _error: "No documents selected. Choose at least one doc in Ideas Source (multi-doc mode) and run again.",
          },
        };
      }
      const items: IdeaItem[] = [];
      for (const doc of docs) {
        if (!doc?.content) continue;
        const parsed = tiptapDocToItems(doc.content, splitMode);
        const first = parsed[0];
        const title = String(doc.title ?? first?.title ?? doc.id ?? "Untitled");
        const ideaText = String(
          (first?.ideaText as string | undefined) ??
            (first?.idea as string | undefined) ??
            "",
        );
        const scriptText = String(
          (first?.scriptText as string | undefined) ??
            (first?.idea as string | undefined) ??
            "",
        );
        items.push({
          id: String(doc.id ?? first?.id ?? `doc-${items.length + 1}`),
          title,
          idea: ideaText || scriptText,
          meta: {
            docId: doc.id,
            docTitle: doc.title,
            ideaText,
            scriptText,
          },
        });
      }
      return { output: { items } };
    }

    const ideaDoc = ctx.inputData._ideaDoc as { title?: string; content?: unknown } | undefined;
    if (!ideaDoc?.content) {
      return { output: { items: [], _error: "No document selected. Save a doc in Ideas & Scripts and run again." } };
    }
    const items = tiptapDocToItems(ideaDoc.content, splitMode);
    const validated = items.map((item) => ({
      ...item,
      idea: item.idea ?? item.ideaText ?? item.scriptText ?? "",
    }));
    return { output: { items: validated } };
  }

  // manual
  const raw = config.manualItems ?? "";
  const items = parseManualItems(raw);
  const validated = items
    .map((item) => ideaItemSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => (r as { success: true; data: IdeaItem }).data);

  return { output: { items: validated } };
}
