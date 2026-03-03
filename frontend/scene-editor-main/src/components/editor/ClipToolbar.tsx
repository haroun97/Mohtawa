import { useState } from "react";
import {
  Scissors,
  Pencil,
  MessageSquare,
  Copy,
  Trash2,
  CopyPlus,
  ArrowLeftRight,
  AudioLines,
  Mic2,
  RotateCcw,
  Gauge,
  Replace,
} from "lucide-react";

interface ClipToolbarProps {
  clipType: "video" | "text" | "audio";
  onSlip?: () => void;
}

interface ToolAction {
  icon: React.ReactNode;
  label: string;
  id: string;
}

const primaryActions: ToolAction[] = [
  { icon: <Scissors size={20} />, label: "Split", id: "split" },
  { icon: <Pencil size={20} />, label: "Edit", id: "edit" },
  { icon: <MessageSquare size={20} />, label: "TTS", id: "tts" },
  { icon: <Copy size={20} />, label: "Copy", id: "copy" },
  { icon: <Trash2 size={20} />, label: "Delete", id: "delete" },
  { icon: <CopyPlus size={20} />, label: "Duplicate", id: "duplicate" },
];

const editActions: ToolAction[] = [
  { icon: <ArrowLeftRight size={20} />, label: "Slip", id: "slip" },
  { icon: <AudioLines size={20} />, label: "Extract", id: "extract" },
  { icon: <Mic2 size={20} />, label: "Voice FX", id: "voicefx" },
  { icon: <RotateCcw size={20} />, label: "Reverse", id: "reverse" },
  { icon: <Gauge size={20} />, label: "Speed", id: "speed" },
  { icon: <Replace size={20} />, label: "Replace", id: "replace" },
];

const ClipToolbar = ({ clipType, onSlip }: ClipToolbarProps) => {
  const [showEdit, setShowEdit] = useState(false);
  const actions = showEdit ? editActions : primaryActions;

  return (
    <div className="bg-editor-toolbar border-t border-border animate-slide-up">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => {
              if (action.id === "edit") setShowEdit(true);
              if (action.id === "slip" && onSlip) onSlip();
            }}
            className="toolbar-icon flex-shrink-0 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-150 hover:bg-editor-surface"
          >
            {action.icon}
            <span className="text-[10px] font-medium">{action.label}</span>
          </button>
        ))}
      </div>
      {showEdit && (
        <button
          onClick={() => setShowEdit(false)}
          className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      )}
    </div>
  );
};

export default ClipToolbar;
