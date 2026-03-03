/**
 * Ideas & Scripts editor document storage (localStorage).
 * Used by the editor page and by the workflow run to send ideaDoc when Ideas Source uses In-app Editor.
 */

const STORAGE_KEY = "mohtawa-ideas-editor-doc";

export interface IdeasDoc {
  title: string;
  content: object;
}

export function getIdeasDocForWorkflow(): IdeasDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IdeasDoc;
    if (
      parsed &&
      typeof parsed.title === "string" &&
      parsed.content &&
      typeof parsed.content === "object"
    )
      return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function loadDocFromStorage(): IdeasDoc | null {
  return getIdeasDocForWorkflow();
}

export { STORAGE_KEY };
