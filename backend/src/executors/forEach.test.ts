import { describe, it, expect } from "vitest";
import { executeForEach } from "./forEach.js";
import type { ExecutorContext } from "./index.js";

const baseCtx: ExecutorContext = {
  nodeId: "n1",
  nodeType: "flow.for_each",
  category: "logic",
  config: {},
  inputData: {},
  getApiKey: async () => null,
};

describe("executeForEach", () => {
  it("returns empty results when no items in input", () => {
    const result = executeForEach(baseCtx);
    expect("output" in result).toBe(true);
    expect((result as { output: { results: unknown[] } }).output.results).toEqual([]);
  });

  it("returns one result per item with itemId from item.id", () => {
    const result = executeForEach({
      ...baseCtx,
      inputData: {
        items: [
          { id: "idea-1", title: "Title 1", idea: "Idea one" },
          { id: "idea-2", title: "Title 2", idea: "Idea two" },
        ],
      },
    });
    const out = (result as { output: { results: { itemId: string }[]; items: unknown[] } }).output;
    expect(out.results).toHaveLength(2);
    expect(out.results[0].itemId).toBe("idea-1");
    expect(out.results[1].itemId).toBe("idea-2");
    expect(out.items).toHaveLength(2);
  });

  it("uses output key from upstream (edge sourceHandle)", () => {
    const result = executeForEach({
      ...baseCtx,
      inputData: {
        output: {
          items: [
            { id: "a", title: "A", idea: "A" },
            { id: "b", title: "B", idea: "B" },
          ],
        },
      },
    });
    const results = (result as { output: { results: { itemId: string }[] } }).output.results;
    expect(results).toHaveLength(2);
    expect(results[0].itemId).toBe("a");
    expect(results[1].itemId).toBe("b");
  });
});
