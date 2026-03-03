import type { ExecutorContext, ExecutorResult } from "./index.js";
import {
  writeScriptConfigSchema,
  writeScriptOutputSchema,
  type WriteScriptOutput,
} from "../schemas/ideasLoopSchemas.js";

/**
 * Resolve the "current item" from inputData: either _item (injected by engine
 * when running inside For Each), first item from items array, or a single
 * upstream output object (e.g. { title, idea, script } from another node).
 */
function getItemFromInput(inputData: Record<string, unknown>): Record<string, unknown> | null {
  const item = inputData._item ?? inputData.item;
  if (item && typeof item === "object" && item !== null) {
    return item as Record<string, unknown>;
  }
  const items = inputData.items ?? inputData.output;
  const arr = Array.isArray(items) ? items : undefined;
  if (arr && arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null) {
    return arr[0] as Record<string, unknown>;
  }
  for (const v of Object.values(inputData)) {
    if (v && typeof v === "object" && "items" in v && Array.isArray((v as Record<string, unknown>).items)) {
      const list = (v as { items: unknown[] }).items;
      if (list.length > 0 && typeof list[0] === "object" && list[0] !== null) {
        return list[0] as Record<string, unknown>;
      }
    }
  }
  // Single upstream output (e.g. from another Write Script or node with title/script)
  for (const v of Object.values(inputData)) {
    if (v && typeof v === "object" && v !== null) {
      const o = v as Record<string, unknown>;
      if ("title" in o || "script" in o || "idea" in o) return o;
    }
  }
  return null;
}

/**
 * Get script text from upstream (e.g. another Write Script or node that outputs { script }).
 */
function getScriptFromUpstream(inputData: Record<string, unknown>): string {
  for (const v of Object.values(inputData)) {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.script === "string" && o.script.trim()) return o.script.trim();
      if (typeof o.text === "string" && o.text.trim()) return o.text.trim();
    }
  }
  return "";
}

export function executeWriteScript(ctx: ExecutorContext): ExecutorResult {
  const parsed = writeScriptConfigSchema.safeParse(ctx.config);
  const config = parsed.success ? parsed.data : { mode: "pass_through" as const };
  const { inputData } = ctx;

  const scriptOverride = typeof config.scriptOverride === "string" ? config.scriptOverride.trim() : "";
  if (config.mode === "manual" && scriptOverride) {
    const out: WriteScriptOutput = {
      title: "Manual",
      idea: "",
      script: scriptOverride,
      text: scriptOverride,
    };
    const validated = writeScriptOutputSchema.safeParse(out);
    return { output: validated.success ? validated.data : out };
  }

  const item = getItemFromInput(inputData);
  const upstreamScript = getScriptFromUpstream(inputData);

  const title = item
    ? String(item.title ?? item.id ?? "Untitled")
    : "Untitled";
  const idea = item
    ? String(item.idea ?? item.ideaText ?? "")
    : "";
  const script =
    upstreamScript ||
    (item
      ? String(
          item.scriptText ?? item.script ?? item.idea ?? item.ideaText ?? ""
        ).trim()
      : "");

  const output: WriteScriptOutput = {
    title,
    idea,
    script,
    text: script || undefined,
  };
  const validated = writeScriptOutputSchema.safeParse(output);
  return { output: validated.success ? validated.data : output };
}
