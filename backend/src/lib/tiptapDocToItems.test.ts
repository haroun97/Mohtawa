import { describe, it, expect } from "vitest";
import {
  splitByHeadings,
  splitByDivider,
  tiptapDocToItems,
} from "./tiptapDocToItems.js";

describe("tiptapDocToItems", () => {
  it("splitByHeadings splits by H2", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "First Idea" }] },
        { type: "paragraph", content: [{ type: "text", text: "Idea one text." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Second Idea" }] },
        { type: "paragraph", content: [{ type: "text", text: "Idea two text." }] },
      ],
    };
    const sections = splitByHeadings(doc);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toBe("First Idea");
    expect(sections[1].title).toBe("Second Idea");
  });

  it("splitByDivider splits by horizontalRule", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Block one" }] },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "Block two" }] },
      ],
    };
    const sections = splitByDivider(doc);
    expect(sections).toHaveLength(2);
    expect(sections[0].blocks.map((b) => b.type)).toEqual(["paragraph"]);
    expect(sections[1].blocks.map((b) => b.type)).toEqual(["paragraph"]);
  });

  it("tiptapDocToItems(headings) returns items with title and idea", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why Tunisia" }] },
        { type: "paragraph", content: [{ type: "text", text: "20-30 sec reel." }] },
      ],
    };
    const items = tiptapDocToItems(doc, "headings");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Why Tunisia");
    expect(items[0].idea).toContain("20-30 sec reel");
  });

  it("tiptapDocToItems(divider) returns items", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "horizontalRule" },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] },
      ],
    };
    const items = tiptapDocToItems(doc, "divider");
    expect(items).toHaveLength(2);
    expect(items[0].idea).toContain("First");
    expect(items[1].idea).toContain("Second");
  });

  it("returns empty array for invalid doc", () => {
    expect(tiptapDocToItems(null, "headings")).toEqual([]);
    expect(tiptapDocToItems({ type: "not-doc" }, "headings")).toEqual([]);
  });
});
