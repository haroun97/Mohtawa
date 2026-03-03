import { describe, it, expect } from "vitest";
import { executeSplitItems } from "./splitItems.js";
import type { ExecutorContext } from "./index.js";

const baseCtx: ExecutorContext = {
  nodeId: "n1",
  nodeType: "text.split_items",
  category: "text",
  config: {},
  inputData: {},
  getApiKey: async () => null,
};

describe("executeSplitItems", () => {
  it("returns empty items when input is empty", () => {
    const result = executeSplitItems({ ...baseCtx, inputData: {} });
    expect((result as { output: { items: unknown[] } }).output.items).toEqual([]);
    const result2 = executeSplitItems({ ...baseCtx, inputData: { output: "   \n  " } });
    expect((result2 as { output: { items: unknown[] } }).output.items).toEqual([]);
  });

  it("split by headings: splits on # lines", () => {
    const text = `# Intro
Some intro text.

## Part 1
Content for part 1.

## Part 2
Content for part 2.`;
    const result = executeSplitItems({
      ...baseCtx,
      config: { splitMode: "headings" },
      inputData: { output: text },
    });
    const items = (result as { output: { items: { id: string; title: string; idea: string }[] } }).output.items;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].title).toBe("Intro");
    expect(items[0].idea).toContain("Some intro text");
    expect(items.some((i) => i.title === "Part 1" && i.idea.includes("Content for part 1"))).toBe(true);
  });

  it("split by bullets: splits on - or •", () => {
    const text = `- First bullet idea
  More text for first.

- Second bullet
  More for second.

• Third with bullet char`;
    const result = executeSplitItems({
      ...baseCtx,
      config: { splitMode: "bullets" },
      inputData: { output: text },
    });
    const items = (result as { output: { items: unknown[] } }).output.items;
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0]).toMatchObject({ id: "b-1", title: "First bullet idea" });
    expect((items[0] as { idea: string }).idea).toContain("More text for first");
  });

  it("split by separator: splits on ---", () => {
    const text = `Block one
Line two of block one
---
Block two
Line two of block two
---
Block three`;
    const result = executeSplitItems({
      ...baseCtx,
      config: { splitMode: "separator", separator: "---" },
      inputData: { output: text },
    });
    const items = (result as { output: { items: { id: string; title: string; idea: string }[] } }).output.items;
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe("Block one");
    expect(items[0].idea).toContain("Line two of block one");
    expect(items[1].idea).toContain("Block two");
    expect(items[2].idea).toContain("Block three");
  });

  it("accepts input from items key (upstream Ideas Source)", () => {
    const result = executeSplitItems({
      ...baseCtx,
      config: { splitMode: "headings" },
      inputData: {
        items: {
          items: [
            { id: "1", title: "A", idea: "# A\nContent A" },
            { id: "2", title: "B", idea: "# B\nContent B" },
          ],
        },
      },
    });
    const items = (result as { output: { items: unknown[] } }).output.items;
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
