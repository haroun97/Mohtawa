import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type ExportResolution = 'HD' | '2K' | '4K';
export type ExportFps = 24 | 30 | 60;
export type ExportColor = 'SDR' | 'HDR';

export interface ExportOptions {
  resolution: ExportResolution;
  fps: ExportFps;
  color: ExportColor;
}

const RESOLUTIONS: ExportResolution[] = ['HD', '2K', '4K'];
const FPS_OPTIONS: ExportFps[] = [24, 30, 60];
const COLOR_OPTIONS: ExportColor[] = ['SDR', 'HDR'];

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="ios-segmented flex">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-semibold transition-all duration-200',
              value === opt ? 'ios-segmented-active' : 'text-muted-foreground'
            )}
          >
            {String(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: ExportOptions) => void;
  exporting?: boolean;
  exportProgress?: number;
  initialResolution?: ExportResolution;
  initialFps?: ExportFps;
}

const EXPORT_ESTIMATED_SECONDS = 45;

export function ExportModal({
  open,
  onOpenChange,
  onExport,
  exporting = false,
  exportProgress = 0,
  initialResolution = 'HD',
  initialFps = 30,
}: ExportModalProps) {
  const [resolution, setResolution] = useState<ExportResolution>(initialResolution);
  const [fps, setFps] = useState<ExportFps>(initialFps);
  const [color, setColor] = useState<ExportColor>('SDR');
  const [timeRemainingSec, setTimeRemainingSec] = useState(EXPORT_ESTIMATED_SECONDS);

  useEffect(() => {
    if (open) {
      setResolution(initialResolution);
      setFps(initialFps);
    }
  }, [open, initialResolution, initialFps]);

  useEffect(() => {
    if (!exporting) {
      setTimeRemainingSec(EXPORT_ESTIMATED_SECONDS);
      return;
    }
    setTimeRemainingSec(EXPORT_ESTIMATED_SECONDS);
    const interval = setInterval(() => {
      setTimeRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [exporting]);

  const handleConfirm = () => {
    onExport({ resolution, fps, color });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[250] bg-editor-bg/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-[50%] top-[50%] z-[250] w-[85%] max-w-[340px] translate-x-[-50%] translate-y-[-50%]',
            'bg-editor-surface rounded-3xl p-5 shadow-2xl',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <div className="flex items-center justify-between mb-5">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {exporting ? 'Exporting…' : 'Export Settings'}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="w-7 h-7 flex items-center justify-center rounded-full bg-editor-bg editor-glass-hover disabled:pointer-events-none"
              disabled={exporting}
            >
              <X size={14} className="text-muted-foreground" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          {exporting ? (
            <div className="space-y-4">
              <Progress value={exportProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round(exportProgress)}%</span>
                <span>About {timeRemainingSec} s remaining</span>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <SegmentedControl<ExportResolution>
                  label="Resolution"
                  value={resolution}
                  options={RESOLUTIONS}
                  onChange={setResolution}
                />
                <SegmentedControl<ExportFps>
                  label="Frame rate"
                  value={fps}
                  options={FPS_OPTIONS}
                  onChange={setFps}
                />
                <SegmentedControl<ExportColor>
                  label="Colour"
                  value={color}
                  options={COLOR_OPTIONS}
                  onChange={setColor}
                />
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full mt-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              >
                Export Video
              </button>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
