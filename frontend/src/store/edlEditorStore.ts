import { create } from 'zustand';

export type EditorTool = 'adjust' | 'audio' | 'captions' | 'trim' | null;

export type SelectedBlock =
  | { type: 'video'; id: string }
  | { type: 'text'; id: string }
  | { type: 'adjust' }
  | { type: 'audio' }
  | null;

export const edlEditorStore = create<{
  selectedBlock: SelectedBlock;
  activeTool: EditorTool;
  saveStatus: 'idle' | 'saving' | 'saved';
  slipMode: boolean;
  slipClipId: string | null;
  setSelectedBlock: (block: SelectedBlock) => void;
  setActiveTool: (tool: EditorTool) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved') => void;
  setSlipMode: (active: boolean, clipId?: string | null) => void;
}>((set) => ({
  selectedBlock: null,
  activeTool: null,
  saveStatus: 'idle',
  slipMode: false,
  slipClipId: null,
  setSelectedBlock: (block) => set({ selectedBlock: block }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setSlipMode: (active, clipId) =>
    set({ slipMode: active, slipClipId: active ? clipId ?? null : null }),
}));

/** Selected video clip id when selectedBlock.type === 'video'. */
export function getSelectedClipId(store: { selectedBlock: SelectedBlock }): string | null {
  return store.selectedBlock?.type === 'video' ? store.selectedBlock.id : null;
}