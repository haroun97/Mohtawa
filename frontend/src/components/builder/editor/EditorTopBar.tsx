import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, Download, ChevronDown, Undo2, Redo2 } from 'lucide-react';
import { ExportModal, type ExportOptions, type ExportResolution, type ExportFps } from './ExportModal';

interface EditorTopBarProps {
  projectName?: string;
  resolution?: string;
  initialExportResolution?: ExportResolution;
  initialExportFps?: ExportFps;
  onClose: () => void;
  onExport: (options?: ExportOptions) => void | Promise<void>;
  exportDisabled?: boolean;
  exporting?: boolean;
  exportProgress?: number;
  error?: string | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

/** Map height-based resolution to short badge label (e.g. 1080p -> HD). */
function resolutionBadgeLabel(resolution: string): string {
  if (resolution.includes('2160') || resolution === '4K') return '4K';
  if (resolution.includes('1440') || resolution === '2K') return '2K';
  if (resolution.includes('1080') || resolution === 'HD') return 'HD';
  return resolution;
}

export function EditorTopBar({
  projectName = 'Project',
  resolution = '1080p',
  initialExportResolution,
  initialExportFps,
  onClose,
  onExport,
  exportDisabled = false,
  exporting = false,
  exportProgress = 0,
  error,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: EditorTopBarProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleExportClick = () => setExportModalOpen(true);
  const handleExportConfirm = (options: ExportOptions) => {
    const result = onExport(options);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setExportModalOpen(false));
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-border bg-background/95 px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 rounded-full h-9 w-9"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-0.5 border-r border-border pr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="shrink-0 h-8 w-8"
              aria-label="Undo"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="shrink-0 h-8 w-8"
              aria-label="Redo"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 min-w-0 text-sm font-medium truncate text-left hover:opacity-80 transition-opacity"
            aria-haspopup="listbox"
            aria-expanded={false}
          >
            <span className="truncate">{projectName}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportClick}
            disabled={exportDisabled}
            className="cursor-pointer rounded-md border border-transparent px-2 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Change resolution and export options"
            title="Change resolution (HD / 2K / 4K) and export"
          >
            {resolutionBadgeLabel(resolution)}
          </button>
          <Button
            size="sm"
            onClick={handleExportClick}
            disabled={exportDisabled}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        </div>
      </header>
      {error && (
        <p className="absolute left-1/2 -translate-x-1/2 top-12 text-xs text-destructive z-10 pointer-events-none max-w-[80vw] text-center">
          {error}
        </p>
      )}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onExport={handleExportConfirm}
        exporting={exporting}
        exportProgress={exportProgress}
        initialResolution={initialExportResolution}
        initialFps={initialExportFps}
      />
    </>
  );
}
