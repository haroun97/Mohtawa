/**
 * Resolve a value from workflow inputData by key names, searching recursively.
 * Handles nested output from pass-through nodes (e.g. Preview Output wrapping upstream).
 */

export function resolveInputDeep<T>(
  inputData: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  const visited = new Set<object>();

  function search(obj: unknown): T | undefined {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== "object") return undefined;
    if (visited.has(obj as object)) return undefined;
    visited.add(obj as object);

    const o = obj as Record<string, unknown>;

    for (const key of keys) {
      if (key in o) {
        const v = o[key];
        if (v !== undefined && v !== null) return v as T;
      }
    }

    for (const v of Object.values(o)) {
      const found = search(v);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  return search(inputData);
}
