import type { ExecutorContext, ExecutorResult } from "./index.js";
import { forEachResultItemSchema } from "../schemas/ideasLoopSchemas.js";

/**
 * For Each node executor.
 *
 * When the execution engine runs this node, it receives upstream output
 * containing { items: IdeaItem[] }. This executor returns a structured
 * { results } array so the node completes successfully.
 *
 * Full "run downstream nodes once per item" with context.item / $index / $total
 * is intended to be implemented in the execution engine (runExecution in
 * services/execution.ts): when the current node is flow.for_each, the engine
 * should run the downstream subgraph once per item and aggregate results here.
 * Until then, this executor acts as a pass-through that shapes items into
 * results (one result per item with placeholder outputs).
 */
export function executeForEach(ctx: ExecutorContext): ExecutorResult {
  let items: unknown[] = [];
  if (Array.isArray(ctx.inputData.items)) {
    items = ctx.inputData.items;
  } else {
    for (const v of Object.values(ctx.inputData)) {
      if (v && typeof v === "object" && "items" in v && Array.isArray((v as Record<string, unknown>).items)) {
        items = (v as { items: unknown[] }).items;
        break;
      }
    }
  }

  const results = items.map((item, index) => {
    const id = typeof item === "object" && item !== null && "id" in item
      ? String((item as Record<string, unknown>).id)
      : `item-${index + 1}`;
    const parsed = forEachResultItemSchema.safeParse({
      itemId: id,
      outputsByNodeId: {},
      finalVideoUrl: null,
    });
    return parsed.success ? parsed.data : { itemId: id, outputsByNodeId: {}, finalVideoUrl: null };
  });

  return {
    output: {
      results,
      // Preserve items so downstream can still reference them if needed
      items,
    },
  };
}
