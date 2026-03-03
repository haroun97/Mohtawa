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

describe("executeIdeasSource", () => {
  it("returns empty items when manual provider and no input", () => {
    const result = executeIdeasSource({ ...baseCtx, config: { provider: "manual" } });
    expect("output" in result).toBe(true);
    expect((result as { output: { items: unknown[] } }).output.items).toEqual([]);
  });

  it("parses one idea per line in manual mode", () => {
    const result = executeIdeasSource({
      ...baseCtx,
      config: {
        provider: "manual",
        manualItems: "First idea\nSecond idea\nThird",
      },
    });
    expect("output" in result).toBe(true);
    const items = (result as { output: { items: { id: string; title: string; idea: string }[] } }).output.items;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ id: "item-1", title: "First idea", idea: "First idea" });
    expect(items[1]).toMatchObject({ id: "item-2", title: "Second idea", idea: "Second idea" });
    expect(items[2]).toMatchObject({ id: "item-3", title: "Third", idea: "Third" });
  });

  it("parses JSON array in manual mode", () => {
    const result = executeIdeasSource({
      ...baseCtx,
      config: {
        provider: "manual",
        manualItems: '[{"id":"a","title":"Title A","idea":"Idea A"},{"id":"b","title":"Title B","idea":"Idea B"}]',
      },
    });
    const items = (result as { output: { items: { id: string; title: string; idea: string }[] } }).output.items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "a", title: "Title A", idea: "Idea A" });
    expect(items[1]).toMatchObject({ id: "b", title: "Title B", idea: "Idea B" });
  });

  it("CSV mode parses header and column", () => {
    const result = executeIdeasSource({
      ...baseCtx,
      config: {
        provider: "csv",
        manualItems: "title,idea,meta\nVideo 1,Script for video one,\nVideo 2,Script for video two,",
        csvColumn: "idea",
      },
    });
    const items = (result as { output: { items: unknown[] } }).output.items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "csv-1", title: "Script for video one", idea: "Script for video one" });
    expect(items[1]).toMatchObject({ id: "csv-2", title: "Script for video two", idea: "Script for video two" });
  });

  it("in_app_editor parses ideaDoc content and splits by headings", () => {
    const result = executeIdeasSource({
      ...baseCtx,
      config: { provider: "in_app_editor", inAppEditorSplitMode: "headings" },
      inputData: {
        _ideaDoc: {
          title: "My Scripts",
          content: {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Video A" }],
              },
              { type: "paragraph", content: [{ type: "text", text: "Idea for A." }] },
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Video B" }],
              },
              { type: "paragraph", content: [{ type: "text", text: "Idea for B." }] },
            ],
          },
        },
      },
    });
    const items = (result as { output: { items: { title: string; idea: string }[] } }).output.items;
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Video A");
    expect(items[0].idea).toContain("Idea for A");
    expect(items[1].title).toBe("Video B");
    expect(items[1].idea).toContain("Idea for B");
  });

  it("in_app_editor returns empty when no ideaDoc", () => {
    const result = executeIdeasSource({
      ...baseCtx,
      config: { provider: "in_app_editor" },
      inputData: {},
    });
    const out = result as { output: { items: unknown[]; _error?: string } };
    expect(out.output.items).toEqual([]);
    expect(out.output._error).toContain("No document selected");
  });

  it("Notion and Google Docs return stub empty items", () => {
    const notionResult = executeIdeasSource({ ...baseCtx, config: { provider: "notion" } });
    expect((notionResult as { output: { items: unknown[]; _stub?: string } }).output.items).toEqual([]);
    expect((notionResult as { output: { _stub: string } }).output._stub).toContain("Notion");

    const googleResult = executeIdeasSource({ ...baseCtx, config: { provider: "google_docs" } });
    expect((googleResult as { output: { items: unknown[] } }).output.items).toEqual([]);
    expect((googleResult as { output: { _stub: string } }).output._stub).toContain("Google");
  });
});
