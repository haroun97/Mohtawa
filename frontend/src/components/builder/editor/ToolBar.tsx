import { Sliders, Volume2, Type, Scissors, Trash2, SplitSquareVertical } from 'lucide-react';
import { edlEditorStore, getSelectedClipId, type EditorTool } from '@/store/edlEditorStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TOOLS: { id: EditorTool; label: string; icon: React.ReactNode }[] = [
  { id: 'adjust', label: 'Adjust', icon: <Sliders className="h-5 w-5" /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 className="h-5 w-5" /> },
  { id: 'captions', label: 'Captions', icon: <Type className="h-5 w-5" /> },
  { id: 'trim', label: 'Trim', icon: <Scissors className="h-5 w-5" /> },
];

interface ToolBarProps {
  onDeleteClip?: () => void;
  canDelete?: boolean;
}

export function ToolBar({ onDeleteClip, canDelete = false }: ToolBarProps) {
  const activeTool = edlEditorStore((s) => s.activeTool);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const selectedClipId = edlEditorStore(getSelectedClipId);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden border-t border-border bg-background/95 py-2 px-2 scrollbar-thin">
        {TOOLS.map(({ id, label, icon }) => {
          const isActive = activeTool === id;
          const isTrim = id === 'trim';
          const disabled = isTrim && !selectedClipId;
          return (
            <button
              key={id ?? 'null'}
              type="button"
              onClick={() => !disabled && setActiveTool(isActive ? null : id)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-2 min-h-[44px] min-w-[64px] transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={label}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex">
              <button
                type="button"
                disabled
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-2 min-h-[44px] min-w-[64px] opacity-50 cursor-not-allowed"
                title="Split (coming soon)"
              >
                <SplitSquareVertical className="h-5 w-5" />
                <span className="text-[10px] font-medium">Split</span>
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Split clip (backend required)</p>
          </TooltipContent>
        </Tooltip>
        {onDeleteClip != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onDeleteClip}
                disabled={!canDelete}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-2 min-h-[44px] min-w-[64px] transition-colors hover:bg-destructive/20 hover:text-destructive',
                  !canDelete && 'opacity-50 cursor-not-allowed'
                )}
                title="Delete clip"
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-[10px] font-medium">Delete</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete selected clip</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
