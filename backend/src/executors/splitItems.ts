import type { ExecutorContext, ExecutorResult } from "./index.js";
import {
  splitItemsConfigSchema,
  ideaItemSchema,
  type IdeaItem,
} from "../schemas/ideasLoopSchemas.js";

function getInputText(inputData: Record<string, unknown>): string {
  for (const key of ["output", "input", "text", "rawText", "content"]) {
    const v = inputData[key];
    if (typeof v === "string") return v;
    if (v && typeof v === "object" && "text" in v && typeof (v as Record<string, unknown>).text === "string") {
      return (v as Record<string, unknown>).text as string;
    }
    if (v && typeof v === "object" && "content" in v && typeof (v as Record<string, unknown>).content === "string") {
      return (v as Record<string, unknown>).content as string;
    }
  }
  const first = Object.values(inputData)[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && first !== null) {
    if ("items" in first && Array.isArray((first as Record<string, unknown>).items)) {
      const items = (first as { items: unknown[] }).items;
      return items.map((i) => (typeof i === "object" && i && "idea" in i ? String((i as Record<string, unknown>).idea) : String(i))).join("\n\n");
    }
    if ("text" in first) return String((first as Record<string, unknown>).text);
  }
  return "";
}

function splitByHeadings(text: string): IdeaItem[] {
  const lines = text.split(/\r?\n/);
  const items: IdeaItem[] = [];
  let current: { title: string; lines: string[] } | null = null;
  const flush = () => {
    if (current && (current.lines.length > 0 || current.title)) {
      items.push({
        id: `h-${items.length + 1}`,
        title: current.title,
        idea: [current.title, ...current.lines].join("\n").trim(),
      });
    }
  };
  const headingRe = /^(#{1,6}\s+.+)$/;
  for (const line of lines) {
    if (headingRe.test(line.trim())) {
      flush();
      current = { title: line.replace(/^#+\s*/, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { title: line.slice(0, 100), lines: [line] };
    }
  }
  flush();
  if (items.length === 0 && text.trim()) {
    items.push({ id: "h-1", title: text.slice(0, 100), idea: text.trim() });
  }
  return items;
}

function splitByBullets(text: string): IdeaItem[] {
  const lines = text.split(/\r?\n/);
  const items: IdeaItem[] = [];
  const bulletRe = /^[\s]*[-•*]\s+/;
  let current: string[] = [];
  const flush = () => {
    const block = current.join("\n").trim();
    if (block) {
      const firstLine = current[0]?.replace(bulletRe, "").trim() ?? "";
      items.push({
        id: `b-${items.length + 1}`,
        title: firstLine.slice(0, 100),
        idea: block,
      });
    }
  };
  for (const line of lines) {
    if (bulletRe.test(line)) {
      if (current.length) flush();
      current = [line];
    } else {
      current.push(line);
    }
  }
  flush();
  if (items.length === 0 && text.trim()) {
    items.push({ id: "b-1", title: text.slice(0, 100), idea: text.trim() });
  }
  return items;
}

function splitBySeparator(text: string, separator: string): IdeaItem[] {
  const sep = (separator || "---").trim();
  const blocks = text.split(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const firstLine = block.split(/\r?\n/)[0]?.trim() ?? "";
    return {
      id: `s-${i + 1}`,
      title: firstLine.slice(0, 100),
      idea: block,
    };
  });
}

export function executeSplitItems(ctx: ExecutorContext): ExecutorResult {
  const parsed = splitItemsConfigSchema.safeParse(ctx.config);
  const config = parsed.success ? parsed.data : { splitMode: "headings" as const };

  const text = getInputText(ctx.inputData);
  if (!text.trim()) {
    return { output: { items: [] } };
  }

  let items: IdeaItem[];
  switch (config.splitMode) {
    case "bullets":
      items = splitByBullets(text);
      break;
    case "separator":
      items = splitBySeparator(text, config.separator ?? "---");
      break;
    default:
      items = splitByHeadings(text);
  }

  const validated = items
    .map((item) => ideaItemSchema.safeParse(item))
    .filter((r) => r.success)
    .map((r) => (r as { success: true; data: IdeaItem }).data);

  return { output: { items: validated } };
}
