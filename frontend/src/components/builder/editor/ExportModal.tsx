import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/50">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              value === opt
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt}
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
          className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            'fixed left-[50%] top-[50%] z-[250] w-full max-w-sm translate-x-[-50%] translate-y-[-50%]',
            'rounded-2xl border bg-background/95 p-6 shadow-xl',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold">
            {exporting ? 'Exporting…' : 'Export'}
          </DialogPrimitive.Title>
          {exporting ? (
            <div className="mt-5 space-y-4">
              <Progress value={exportProgress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {Math.round(exportProgress)}%
                </span>
                <span className="text-muted-foreground">
                  About {timeRemainingSec} s remaining
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-5">
                <SegmentedControl
                  label="Resolution"
                  value={resolution}
                  options={RESOLUTIONS}
                  onChange={setResolution}
                />
                <SegmentedControl
                  label="Frame rate"
                  value={fps}
                  options={FPS_OPTIONS}
                  onChange={setFps}
                />
                <SegmentedControl
                  label="Color"
                  value={color}
                  options={COLOR_OPTIONS}
                  onChange={setColor}
                />
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  Export
                </Button>
              </div>
            </>
          )}
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none"
            disabled={exporting}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
