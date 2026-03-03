import {
  Music,
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
} from "lucide-react";

interface ToolItem {
  icon: React.ReactNode;
  label: string;
  id: string;
}

interface BottomToolbarProps {
  activeToolId?: string;
  onToolSelect: (id: string) => void;
}

const tools: ToolItem[] = [
  { icon: <Music size={20} />, label: "Audio", id: "audio" },
  { icon: <Type size={20} />, label: "Text", id: "text" },
  { icon: <Mic size={20} />, label: "Voice", id: "voice" },
  { icon: <Link size={20} />, label: "Links", id: "links" },
  { icon: <Captions size={20} />, label: "Captions", id: "captions" },
  { icon: <Sparkles size={20} />, label: "Filters", id: "filters" },
  { icon: <SlidersHorizontal size={20} />, label: "Adjust", id: "adjust" },
  { icon: <Layers size={20} />, label: "Overlay", id: "overlay" },
  { icon: <Volume2 size={20} />, label: "Sound FX", id: "soundfx" },
  { icon: <Scissors size={20} />, label: "Cutout", id: "cutout" },
  { icon: <Sticker size={20} />, label: "Sticker", id: "sticker" },
];

const BottomToolbar = ({ activeToolId, onToolSelect }: BottomToolbarProps) => {
  return (
    <div className="bg-editor-toolbar border-t border-border">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            className={`toolbar-icon flex-shrink-0 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-150
              ${activeToolId === tool.id ? "toolbar-icon-active bg-editor-surface" : ""}`}
          >
            {tool.icon}
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BottomToolbar;
