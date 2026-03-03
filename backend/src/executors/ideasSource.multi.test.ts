import { describe, it, expect } from "vitest";
import { executeIdeasSource } from "./ideasSource.js";
import type { ExecutorContext } from "./index.js";

const baseCtx: ExecutorContext = {
  nodeId: "n1",
  nodeType: "ideas.source",
  category: "ideas",
  config: {},
  inputData: {},
  getApiKey: async () => null,
};

describe("executeIdeasSource - in_app_editor multi-doc mode", () => {
  it("emits one item per document when in multi mode", () => {
    const ctx: ExecutorContext = {
      ...baseCtx,
      config: {
        provider: "in_app_editor",
        inAppEditorDocMode: "multi",
        inAppEditorSplitMode: "headings",
      },
      inputData: {
        _ideaDocs: [
          {
            id: "doc-paris",
            title: "Paris",
            content: {
              type: "doc",
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [{ type: "text", text: "Paris is nice" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "A short script about Paris." }],
                },
              ],
            },
          },
          {
            id: "doc-italy",
            title: "Italy",
            content: {
              type: "doc",
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [{ type: "text", text: "Italy is beautiful" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "A short script about Italy." }],
                },
              ],
            },
          },
        ],
      },
    };

    const result = executeIdeasSource(ctx) as { output: { items: Array<{ id: string; title: string; idea: string; meta?: Record<string, unknown> }> } };
    const { items } = result.output;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("doc-paris");
    expect(items[0].title).toBe("Paris");
    expect(items[0].idea).toContain("Paris");
    expect(items[0].meta?.docId).toBe("doc-paris");

    expect(items[1].id).toBe("doc-italy");
    expect(items[1].title).toBe("Italy");
    expect(items[1].idea).toContain("Italy");
    expect(items[1].meta?.docId).toBe("doc-italy");
  });
});

