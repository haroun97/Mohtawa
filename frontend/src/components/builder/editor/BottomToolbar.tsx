import {
  Type,
  Mic,
  Link,
  Captions,
  SlidersHorizontal,
  Layers,
  Volume2,
  Scissors,
  Sticker,
  Sparkles,
} from 'lucide-react';

interface ToolItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

const TOOLS: ToolItem[] = [
  { icon: <Volume2 size={20} />, label: 'Volume', id: 'audio' },
  { icon: <Type size={20} />, label: 'Text', id: 'text' },
  { icon: <Mic size={20} />, label: 'Voice', id: 'voice' },
  { icon: <Link size={20} />, label: 'Links', id: 'links' },
  { icon: <Captions size={20} />, label: 'Captions', id: 'captions' },
  { icon: <Sparkles size={20} />, label: 'Filters', id: 'filters' },
  { icon: <SlidersHorizontal size={20} />, label: 'Adjust', id: 'adjust' },
  { icon: <Layers size={20} />, label: 'Overlay', id: 'overlay' },
  { icon: <Volume2 size={20} />, label: 'Sound FX', id: 'soundfx' },
  { icon: <Scissors size={20} />, label: 'Cutout', id: 'cutout' },
  { icon: <Sticker size={20} />, label: 'Sticker', id: 'sticker' },
  { icon: <Scissors size={20} />, label: 'Trim', id: 'trim' },
];

const TRIM_ID = 'trim';

export interface BottomToolbarProps {
  /** Active tool id (template has 11; we support adjust, audio, captions, trim for panels). */
  activeToolId: string | null;
  onToolSelect: (id: string | null) => void;
  /** When true, Trim is disabled (no clip selected). We show Trim in ClipToolbar when clip selected; here Trim can open trim sheet. */
  trimDisabled?: boolean;
}

export function BottomToolbar({
  activeToolId,
  onToolSelect,
  trimDisabled = false,
}: BottomToolbarProps) {
  return (
    <div className="bg-editor-toolbar/95 border-t border-border/30 flex-shrink-0 rounded-t-2xl">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-1">
        {TOOLS.map((tool) => {
          const isActive = activeToolId === tool.id;
          const disabled = tool.id === TRIM_ID && trimDisabled;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => !disabled && onToolSelect(isActive ? null : tool.id)}
              disabled={disabled}
              className={`toolbar-icon flex-shrink-0 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-150 min-h-[44px] hover:bg-editor-surface/80 ${
                isActive ? 'toolbar-icon-active bg-editor-surface ring-1 ring-primary/30 text-primary' : 'text-white'
              } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {tool.icon}
              <span className="text-[10px] font-medium">{tool.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
