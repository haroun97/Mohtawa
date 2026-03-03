import { useState } from 'react';
import {
  Scissors,
  Pencil,
  MessageSquare,
  Copy,
  Trash2,
  CopyPlus,
  Replace,
  ArrowLeftRight,
  AudioLines,
  Mic2,
  RotateCcw,
  Gauge,
  Volume2,
} from 'lucide-react';

export interface ClipToolbarProps {
  clipType: 'video' | 'audio';
  onSplit?: () => void;
  onEdit?: () => void;
  onTts?: () => void;
  /** Opens the volume control (e.g. for this clip's original sound). */
  onVolume?: () => void;
  /** Copy clip (e.g. duplicate for now; or copy to clipboard for paste later). */
  onCopy?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSlip?: () => void;
  onReplace?: () => void;
  canSplit?: boolean;
  canDelete?: boolean;
}

export function ClipToolbar({
  clipType,
  onSplit,
  onEdit,
  onTts,
  onVolume,
  onCopy,
  onDelete,
  onDuplicate,
  onSlip,
  onReplace,
  canSplit = false,
  canDelete = true,
}: ClipToolbarProps) {
  const [showEdit, setShowEdit] = useState(false);

  const primaryActions = [
    { icon: <Scissors size={20} />, label: 'Split', id: 'split', onClick: onSplit, disabled: !canSplit },
    { icon: <Pencil size={20} />, label: 'Edit', id: 'edit', onClick: () => { setShowEdit(true); onEdit?.(); } },
    { icon: <Volume2 size={20} />, label: 'Volume', id: 'volume', onClick: onVolume },
    { icon: <MessageSquare size={20} />, label: 'TTS', id: 'tts', onClick: onTts },
    { icon: <Copy size={20} />, label: 'Copy', id: 'copy', onClick: onCopy ?? onDuplicate },
    { icon: <Trash2 size={20} />, label: 'Delete', id: 'delete', onClick: onDelete, disabled: !canDelete },
    { icon: <CopyPlus size={20} />, label: 'Duplicate', id: 'duplicate', onClick: onDuplicate },
  ];

  const editActions = [
    { icon: <ArrowLeftRight size={20} />, label: 'Slip', id: 'slip', onClick: onSlip },
    { icon: <AudioLines size={20} />, label: 'Extract', id: 'extract', onClick: undefined, disabled: true },
    { icon: <Mic2 size={20} />, label: 'Voice FX', id: 'voicefx', onClick: undefined, disabled: true },
    { icon: <RotateCcw size={20} />, label: 'Reverse', id: 'reverse', onClick: undefined, disabled: true },
    { icon: <Gauge size={20} />, label: 'Speed', id: 'speed', onClick: undefined, disabled: true },
    { icon: <Replace size={20} />, label: 'Replace', id: 'replace', onClick: onReplace, disabled: true },
  ];

  const actions = showEdit ? editActions : primaryActions;

  return (
    <div className="bg-editor-toolbar/95 border-t border-border/30 animate-slide-up flex-shrink-0 rounded-t-2xl">
      <div className="flex overflow-x-auto no-scrollbar px-2 py-3 gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => !action.disabled && action.onClick?.()}
            disabled={action.disabled}
            className={`toolbar-icon flex-shrink-0 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-150 hover:bg-editor-surface/80 active:scale-[0.98] min-h-[44px] ${
              action.disabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {action.icon}
            <span className="text-[10px] font-medium">{action.label}</span>
          </button>
        ))}
      </div>
      {showEdit && (
        <button
          type="button"
          onClick={() => setShowEdit(false)}
          className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
