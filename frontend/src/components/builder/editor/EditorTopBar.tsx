import { useState, type RefObject } from 'react';
import { X, Loader2, Upload, ChevronDown, Save } from 'lucide-react';
import { ExportModal, type ExportOptions, type ExportResolution, type ExportFps } from './ExportModal';

interface EditorTopBarProps {
  projectName?: string;
  resolution?: string;
  initialExportResolution?: ExportResolution;
  initialExportFps?: ExportFps;
  onClose: () => void | Promise<void>;
  onExport: (options?: ExportOptions) => void | Promise<void>;
  onSaveDraft?: () => void | Promise<void>;
  dirty?: boolean;
  savingDraft?: boolean;
  exportDisabled?: boolean;
  exporting?: boolean;
  exportProgress?: number;
  error?: string | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Ref for the close button; parent can focus it when editor opens (e.g. for mobile). */
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
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
  onSaveDraft,
  dirty = false,
  savingDraft = false,
  exportDisabled = false,
  exporting = false,
  exportProgress = 0,
  error,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  closeButtonRef,
}: EditorTopBarProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleExportClick = () => setExportModalOpen(true);
  const handleExportConfirm = (options: ExportOptions) => {
    const result = onExport(options);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setExportModalOpen(false));
    }
  };

  const handleClose = () => {
    const result = onClose();
    if (result != null && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  };

  const handleSaveDraftClick = () => {
    const result = onSaveDraft?.();
    if (result != null && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-editor-bg-immersive flex-shrink-0 min-h-[48px] border-b border-border/30">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-editor-surface hover:text-foreground transition-colors min-w-[44px] min-h-[44px] md:min-w-9 md:min-h-9"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-editor-surface border border-primary/20 editor-glass-hover min-w-0"
          aria-haspopup="listbox"
          aria-expanded={false}
        >
          <span className="text-sm font-medium text-white truncate">{projectName}</span>
          <ChevronDown size={14} className="text-white/70 shrink-0" />
        </button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <button
              type="button"
              onClick={handleSaveDraftClick}
              disabled={!dirty || savingDraft || exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-editor-surface text-xs font-semibold text-white/90 disabled:opacity-50 disabled:pointer-events-none min-w-[44px] min-h-[36px] justify-center"
              aria-label="Save"
              title="Save edits (Ctrl+S)"
            >
              {savingDraft ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span className="hidden sm:inline">Save</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportClick}
            disabled={exportDisabled}
            className="px-2.5 py-1 rounded-md bg-editor-surface text-xs font-semibold text-primary disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Resolution and export options"
            title="Resolution and export"
          >
            {resolutionBadgeLabel(resolution)}
          </button>
          <button
            type="button"
            onClick={handleExportClick}
            disabled={exportDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:pointer-events-none min-w-[44px] min-h-[44px] md:min-w-9 md:min-h-9"
            aria-label="Export"
            title="Export"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
          </button>
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
