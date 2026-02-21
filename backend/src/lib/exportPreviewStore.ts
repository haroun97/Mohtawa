/**
 * In-memory store for sync (in-process) export preview. Keyed by projectId.
 * Used when Redis is not available so the frontend can poll for live preview frames.
 */

export interface ExportPreviewEntry {
  progress: number;
  previewBase64: string | null;
}

const store = new Map<string, ExportPreviewEntry>();

export function setExportPreview(
  projectId: string,
  entry: Partial<ExportPreviewEntry>,
): void {
  const current = store.get(projectId) ?? { progress: 0, previewBase64: null };
  store.set(projectId, { ...current, ...entry });
}

export function getExportPreview(projectId: string): ExportPreviewEntry | undefined {
  return store.get(projectId);
}

export function clearExportPreview(projectId: string): void {
  store.delete(projectId);
}
