import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors,
  Pencil,
  Copy,
  Trash2,
  CopyPlus,
  Replace,
  Sliders,
  Music2,
  Mic2,
  RotateCcw,
  Check,
} from 'lucide-react';
import { edlEditorStore, getSelectedClipId } from '@/store/edlEditorStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ActionItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
};

interface ContextualActionBarProps {
  onEdit?: () => void;
  onDeleteClip?: () => void;
  canDeleteClip?: boolean;
  onDeleteOverlay?: () => void;
  canDeleteOverlay?: boolean;
  onDuplicateClip?: () => void;
  onSplitClipAtPlayhead?: () => void;
  canSplitAtPlayhead?: boolean;
  onEnterSlip?: () => void;
  onExitSlip?: () => void;
}

export function ContextualActionBar({
  onEdit,
  onDeleteClip,
  canDeleteClip = false,
  onDeleteOverlay,
  canDeleteOverlay = false,
  onDuplicateClip,
  onSplitClipAtPlayhead,
  canSplitAtPlayhead = false,
  onEnterSlip,
  onExitSlip,
}: ContextualActionBarProps) {
  const selectedBlock = edlEditorStore((s) => s.selectedBlock);
  const slipMode = edlEditorStore((s) => s.slipMode);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const setSelectedBlock = edlEditorStore((s) => s.setSelectedBlock);
  const setSlipMode = edlEditorStore((s) => s.setSlipMode);
  const selectedClipId = edlEditorStore(getSelectedClipId);

  const handleEdit = () => {
    if (!selectedBlock) return;
    if (selectedBlock.type === 'adjust') setActiveTool('adjust');
    else if (selectedBlock.type === 'audio') setActiveTool('audio');
    else if (selectedBlock.type === 'text') setActiveTool('captions');
    else if (selectedBlock.type === 'video') setActiveTool('trim');
    onEdit?.();
  };

  const actionsByType = (): ActionItem[] => {
    if (!selectedBlock) return [];
    if (selectedBlock.type === 'video') {
      if (slipMode) {
        return [
          {
            id: 'done',
            label: 'Done',
            icon: <Check className="h-4 w-4" />,
            onClick: () => {
              setSlipMode(false);
              onExitSlip?.();
            },
          },
        ];
      }
      return [
        { id: 'replace', label: 'Replace', icon: <Replace className="h-4 w-4" />, disabled: true, title: 'Replace (coming soon)' },
        { id: 'copy', label: 'Copy', icon: <Copy className="h-4 w-4" />, disabled: true, title: 'Copy (coming soon)' },
        { id: 'duplicate', label: 'Duplicate', icon: <CopyPlus className="h-4 w-4" />, onClick: onDuplicateClip },
        {
          id: 'slip',
          label: 'Slip',
          icon: <Sliders className="h-4 w-4" />,
          onClick: () => {
            setSlipMode(true, selectedClipId ?? undefined);
            onEnterSlip?.();
          },
        },
        { id: 'split', label: 'Split', icon: <Scissors className="h-4 w-4" />, onClick: onSplitClipAtPlayhead, disabled: !canSplitAtPlayhead, title: canSplitAtPlayhead ? 'Split at playhead' : 'Position playhead inside clip to split' },
        { id: 'extract', label: 'Extract Audio', icon: <Music2 className="h-4 w-4" />, disabled: true, title: 'Extract Audio (coming soon)' },
        { id: 'voicefx', label: 'Voice FX', icon: <Mic2 className="h-4 w-4" />, disabled: true, title: 'Voice FX (coming soon)' },
        { id: 'reverse', label: 'Reverse', icon: <RotateCcw className="h-4 w-4" />, disabled: true, title: 'Reverse (coming soon)' },
        { id: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: onDeleteClip, disabled: !canDeleteClip, destructive: true },
      ];
    }
    // Text / Audio / Adjust
    const isText = selectedBlock.type === 'text';
    return [
      { id: 'split', label: 'Split', icon: <Scissors className="h-4 w-4" />, disabled: true, title: 'Split (coming soon)' },
      { id: 'edit', label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: handleEdit },
      { id: 'copy', label: 'Copy', icon: <Copy className="h-4 w-4" />, disabled: true, title: 'Copy (coming soon)' },
      {
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: isText ? onDeleteOverlay : onDeleteClip,
        disabled: isText ? !canDeleteOverlay : !canDeleteClip,
        destructive: true,
        title: isText ? 'Delete overlay' : 'Delete clip',
      },
      { id: 'duplicate', label: 'Duplicate', icon: <CopyPlus className="h-4 w-4" />, disabled: true, title: 'Duplicate (coming soon)' },
    ];
  };

  const actions = actionsByType();

  return (
    <TooltipProvider>
      <AnimatePresence>
        {selectedBlock != null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-background/95"
          >
            <div className="flex items-center gap-1 overflow-x-auto py-2 px-3 scrollbar-thin">
              {actions.map(({ id, label, icon, onClick, disabled, destructive, title }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onClick}
                      disabled={disabled}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 min-w-[80px] min-h-[44px] transition-colors text-sm touch-manipulation',
                        disabled && 'opacity-50 cursor-not-allowed',
                        !disabled && destructive && 'hover:bg-destructive/15 hover:text-destructive',
                        !disabled && !destructive && 'hover:bg-muted'
                      )}
                      aria-label={title ?? label}
                    >
                      {icon}
                      <span className="font-medium whitespace-nowrap">{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{title ?? label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
