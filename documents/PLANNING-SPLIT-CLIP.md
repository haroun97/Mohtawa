# Plan: Split clip (Phase 7a #3)

**Goal:** Treat Split as supported: show it in the editor and ensure the flow works end-to-end. No dedicated backend endpoint—split is an EDL edit (one clip → two clips); existing POST EDL and render pipeline handle it.

---

## Current state

- **EdlEditor** already has `splitClipAtPlayhead(clipIndex, playheadSec)`:
  - Splits the clip at the playhead into two clips (first: `outSec` = split point; second: `inSec` = split point, new `id`).
  - Recomputes `startSec` for the timeline and calls `updateEdl`.
  - Undo/redo already covers this (updateEdl pushes to `past`).
- **ContextualActionBar** (when a **video** clip is selected):
  - Split is **enabled** when `canSplitAtPlayhead` (playhead inside the selected clip).
  - Calls `onSplitClipAtPlayhead` → `splitClipAtPlayhead(selectedClipIndex, playheadSec)`.
- **ToolBar** (`ToolBar.tsx`):
  - Has a **disabled** Split button with tooltip “Split (coming soon)” / “Split clip (backend required)”.
  - **Not used** in the current editor layout (EditorPage only uses ContextualActionBar).

So the main Split flow (select clip → position playhead → Split in contextual bar) is already implemented. The plan is to confirm backend behavior, clean up “coming soon” where Split is already supported, and optionally add a keyboard shortcut or use ToolBar.

---

## Implementation plan

### 1. Backend (verify only)

| Step | Task | Notes |
|------|------|--------|
| 1.1 | Confirm EDL schema allows multiple timeline clips | Already does; timeline is an array. |
| 1.2 | Confirm POST EDL / draft-render accept N clips | No change expected; if any validation assumes a single clip, relax or remove it. |
| 1.3 | (Optional) Smoke-test: split in editor → Save → re-run draft render | Ensure output has correct cut at split point. |

**Deliverable:** No backend code change unless validation or render logic assumes a single clip.

---

### 2. Frontend – ContextualActionBar (already done)

- Split is already shown and enabled for **video** when `canSplitAtPlayhead` is true.
- Optional cleanup: ensure tooltip is clear, e.g. “Split at playhead” when enabled and “Position playhead inside clip to split” when disabled (already present).

**Deliverable:** No change required; optional copy tweak only.

---

### 3. Frontend – ToolBar (optional)

`ToolBar.tsx` is not currently used in the editor. Two options:

- **A. Leave as-is**  
  - Keep ToolBar unused; Split remains only in ContextualActionBar.
- **B. Use ToolBar and wire Split**  
  - Add ToolBar to the editor layout (e.g. in EditorPage, next to or above ContextualActionBar).
  - Extend `ToolBarProps` with `onSplitClipAtPlayhead?: () => void` and `canSplitAtPlayhead?: boolean`.
  - Enable the Split button when `canSplitAtPlayhead` is true; call `onSplitClipAtPlayhead` on click.
  - Remove “coming soon” / “backend required” for Split.

**Deliverable:** Either document “Split only in contextual bar” (A) or implement (B) and pass split props from EditorPage → ToolBar.

---

### 4. Frontend – Keyboard shortcut (optional)

- When a video clip is selected and `canSplitAtPlayhead` is true, handle a key (e.g. **S** or **B** for “split”) in the editor’s key handler.
- Call the same `onSplitClipAtPlayhead` (or `splitClipAtPlayhead(selectedClipIndex, playheadSec)`).
- Ensure the shortcut is not fired when focus is in an input (e.g. Trim sheet).

**Deliverable:** Optional; add only if you want a shortcut.

---

### 5. Testing checklist

- [ ] Select a video clip and move playhead inside it → ContextualActionBar shows Split enabled.
- [ ] Click Split → timeline shows two clips; second clip selected; `startSec`/durations correct.
- [ ] Undo → one clip again; Redo → split again.
- [ ] Save (or Export) after split → EDL POST succeeds; draft render (if run) produces correct cut.
- [ ] Edge: playhead at clip start/end → Split disabled.
- [ ] Edge: single clip, split → two clips; delete one → one clip; behavior consistent.

---

### 6. Docs / planning

- In **PLANNING.md**, mark “Split clip (UI + backend)” as done and add a short note, e.g.:  
  - “Split at playhead in ContextualActionBar when a video clip is selected; EDL updated in memory and persisted on Save; no dedicated backend endpoint.”

---

## Summary

| Area | Action |
|------|--------|
| Backend | Verify only (EDL + render support N clips). |
| ContextualActionBar | No change (Split already wired for video). |
| ToolBar | Optional: either use and wire Split, or leave unused. |
| Keyboard | Optional: e.g. S to split when `canSplitAtPlayhead`. |
| Testing | Run through checklist above. |
| Planning | Mark Split-clip task done in PLANNING.md. |

**Minimum to “ship”:** Confirm backend/render behavior + run testing checklist + update PLANNING.md. Optional: ToolBar integration and/or keyboard shortcut.
