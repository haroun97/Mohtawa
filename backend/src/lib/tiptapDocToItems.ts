/**
 * Parse TipTap/ProseMirror document JSON and split into items by H2 headings or by divider (horizontalRule).
 * Used by Ideas Source node (In-app Editor provider).
 */

interface ProseNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseNode[];
  text?: string;
}

function getTextFromNode(node: ProseNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(getTextFromNode).join("");
  return "";
}

function getBlockText(block: ProseNode): string {
  return getTextFromNode(block).trim();
}

/**
 * Split doc.content into sections by heading level 2. Each section is { title, blocks }.
 */
export function splitByHeadings(doc: { content?: ProseNode[] }): Array<{ title: string; blocks: ProseNode[] }> {
  const content = doc.content ?? [];
  const sections: Array<{ title: string; blocks: ProseNode[] }> = [];
  let current: { title: string; blocks: ProseNode[] } | null = null;

  for (const node of content) {
    if (node.type === "heading" && node.attrs?.level === 2) {
      const title = getBlockText(node);
      if (current) sections.push(current);
      current = { title: title || "Untitled", blocks: [node] };
    } else if (current) {
      current.blocks.push(node);
    } else {
      current = { title: "Untitled", blocks: [node] };
    }
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * Split doc.content by horizontalRule nodes. Each section is { blocks }.
 */
export function splitByDivider(doc: { content?: ProseNode[] }): Array<{ blocks: ProseNode[] }> {
  const content = doc.content ?? [];
  const sections: Array<{ blocks: ProseNode[] }> = [];
  let current: ProseNode[] = [];

  for (const node of content) {
    if (node.type === "horizontalRule") {
      if (current.length) sections.push({ blocks: current });
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length) sections.push({ blocks: current });
  return sections;
}

function blocksToText(blocks: ProseNode[]): string {
  return blocks.map(getBlockText).filter(Boolean).join("\n\n");
}

function getTitleFromBlocks(blocks: ProseNode[]): string {
  const first = blocks[0];
  if (first?.type === "heading") return getBlockText(first).slice(0, 200);
  const text = getBlockText(first ?? { type: "paragraph" });
  return text.slice(0, 100) || "Untitled";
}

export interface IdeaItemFromDoc {
  id: string;
  title: string;
  idea: string;
  ideaText?: string;
  scriptText?: string;
  rawBlocks?: ProseNode[];
  meta?: Record<string, unknown>;
}

/**
 * Parse TipTap doc JSON and return items. splitMode: 'headings' (H2) or 'divider' (horizontalRule).
 */
export function tiptapDocToItems(
  docJson: unknown,
  splitMode: "headings" | "divider",
): IdeaItemFromDoc[] {
  const doc = docJson as { type?: string; content?: ProseNode[] };
  if (!doc || doc.type !== "doc") return [];

  if (splitMode === "divider") {
    const sections = splitByDivider(doc);
    return sections.map((sec, i) => {
      const title = getTitleFromBlocks(sec.blocks);
      const text = blocksToText(sec.blocks);
      return {
        id: `item-${i + 1}`,
        title,
        idea: text,
        ideaText: text,
        scriptText: text,
        rawBlocks: sec.blocks,
      };
    });
  }

  const sections = splitByHeadings(doc);
  return sections.map((sec, i) => {
    const fullText = blocksToText(sec.blocks);
    const firstBlock = sec.blocks[0];
    const ideaText =
      firstBlock?.type === "paragraph"
        ? getBlockText(firstBlock)
        : sec.blocks.length > 1 && sec.blocks[1]?.type === "paragraph"
          ? getBlockText(sec.blocks[1])
          : fullText;
    return {
      id: `item-${i + 1}`,
      title: sec.title,
      idea: fullText,
      ideaText,
      scriptText: fullText,
      rawBlocks: sec.blocks,
    };
  });
}
