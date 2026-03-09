/**
 * Convert between Tiptap/ProseMirror doc JSON and Markdown for the Ideas Editor.
 * Backend stores and expects Tiptap JSON; we allow editing as Markdown on mobile.
 */

type ProseNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseNode[];
  text?: string;
};

type TiptapDoc = { type: string; content?: ProseNode[] };

function getTextFromNode(node: ProseNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(getTextFromNode).join('');
  return '';
}

/**
 * Convert Tiptap doc JSON to Markdown (headings, paragraphs, horizontal rule).
 */
export function tiptapToMarkdown(doc: unknown): string {
  const d = doc as TiptapDoc;
  if (!d || !Array.isArray(d.content)) return '';

  const lines: string[] = [];
  for (const node of d.content) {
    if (node.type === 'paragraph') {
      const text = getTextFromNode(node).trim();
      if (text) lines.push(text);
      else lines.push('');
    } else if (node.type === 'heading') {
      const level = (node.attrs?.level as number) ?? 1;
      const text = getTextFromNode(node).trim();
      lines.push('#'.repeat(Math.min(6, Math.max(1, level))) + ' ' + text);
    } else if (node.type === 'horizontalRule') {
      lines.push('---');
    } else {
      const text = getTextFromNode(node).trim();
      if (text) lines.push(text);
    }
  }
  return lines.join('\n');
}

/**
 * Convert Markdown to Tiptap doc JSON (paragraphs, headings, --- as horizontalRule).
 */
export function markdownToTiptap(markdown: string): { type: 'doc'; content: ProseNode[] } {
  const content: ProseNode[] = [];
  const lines = markdown.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      content.push({
        type: 'heading',
        attrs: { level },
        content: text ? [{ type: 'text', text }] : [],
      });
    } else if (line.trim() === '---') {
      content.push({ type: 'horizontalRule' });
    } else {
      content.push({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      });
    }
  }

  if (content.length === 0) {
    content.push({ type: 'paragraph', content: [] });
  }
  return { type: 'doc', content };
}
