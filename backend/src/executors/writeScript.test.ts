import { describe, it, expect } from "vitest";
import { executeWriteScript } from "./writeScript.js";
import type { ExecutorContext } from "./index.js";

const baseCtx: ExecutorContext = {
  nodeId: "n1",
  nodeType: "script.write",
  category: "script",
  config: {},
  inputData: {},
  getApiKey: async () => null,
};

describe("executeWriteScript", () => {
  it("outputs manual script when mode is manual and scriptOverride is set", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "manual", scriptOverride: "Hello, this is my script." },
      inputData: {},
    });
    expect("output" in result).toBe(true);
    const out = (result as { output: { title: string; idea: string; script: string } }).output;
    expect(out.title).toBe("Manual");
    expect(out.script).toBe("Hello, this is my script.");
    expect(out.idea).toBe("");
  });

  it("uses current item from inputData.items[0]", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "pass_through" },
      inputData: {
        items: [
          { id: "1", title: "My Video", idea: "Short pitch", scriptText: "Full script here." },
        ],
      },
    });
    const out = (result as { output: { title: string; idea: string; script: string } }).output;
    expect(out.title).toBe("My Video");
    expect(out.idea).toBe("Short pitch");
    expect(out.script).toBe("Full script here.");
  });

  it("uses _item when provided (For Each context)", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "pass_through" },
      inputData: {
        _item: { id: "2", title: "Item Two", idea: "Idea text", scriptText: "Script for item two." },
      },
    });
    const out = (result as { output: { title: string; idea: string; script: string } }).output;
    expect(out.title).toBe("Item Two");
    expect(out.script).toBe("Script for item two.");
  });

  it("falls back to idea when scriptText is missing", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "pass_through" },
      inputData: {
        items: [{ id: "1", title: "Title", idea: "One-line idea only." }],
      },
    });
    const out = (result as { output: { script: string } }).output;
    expect(out.script).toBe("One-line idea only.");
  });

  it("uses upstream script when inputData contains object with script", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "pass_through" },
      inputData: {
        "upstream-node": { title: "Up", idea: "Idea", script: "Upstream script content." },
      },
    });
    const out = (result as { output: { title: string; script: string } }).output;
    expect(out.title).toBe("Up");
    expect(out.script).toBe("Upstream script content.");
  });

  it("outputs empty title/idea/script when no input", () => {
    const result = executeWriteScript({
      ...baseCtx,
      config: { mode: "pass_through" },
      inputData: {},
    });
    const out = (result as { output: { title: string; idea: string; script: string } }).output;
    expect(out.title).toBe("Untitled");
    expect(out.idea).toBe("");
    expect(out.script).toBe("");
  });
});
