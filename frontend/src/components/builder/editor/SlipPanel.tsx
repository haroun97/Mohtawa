import { useRef, useCallback, useEffect } from 'react';
import { Sliders } from 'lucide-react';
import type { EdlTimelineClip } from '@/lib/api';

const STRIP_WIDTH_PX = 600;
const SOURCE_DISPLAY_MAX_SEC = 120;

interface SlipPanelProps {
  clip: EdlTimelineClip;
  clipIndex: number;
  setClipSlipInAbsolute: (index: number, newInSec: number) => void;
}

export function SlipPanel({ clip, clipIndex, setClipSlipInAbsolute }: SlipPanelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startInSec: number; pxPerSec: number } | null>(null);

  const inSec = clip.inSec;
  const outSec = clip.outSec;
  const duration = Math.max(0.04, outSec - inSec);
  const maxSec = Math.max(outSec + 20, SOURCE_DISPLAY_MAX_SEC, 60);
  const windowLeftPx = (inSec / maxSec) * STRIP_WIDTH_PX;
  const windowWidthPx = (duration / maxSec) * STRIP_WIDTH_PX;
  const pxPerSec = STRIP_WIDTH_PX / maxSec;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !stripRef.current) return;
      const deltaPx = e.clientX - d.startX;
      const deltaSec = deltaPx / d.pxPerSec;
      const newInSec = Math.max(0, d.startInSec + deltaSec);
      setClipSlipInAbsolute(clipIndex, newInSec);
    },
    [clipIndex, setClipSlipInAbsolute]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startInSec: inSec, pxPerSec };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [inSec, handleMouseMove, handleMouseUp]
  );

  useEffect(() => () => {
    if (dragRef.current) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col gap-1.5 py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-200">
        <Sliders className="h-3.5 w-3.5" />
        Slip source window — drag to shift in/out
      </div>
      <div
        ref={stripRef}
        className="relative h-8 rounded bg-muted/80 overflow-hidden cursor-ew-resize select-none"
        style={{ width: STRIP_WIDTH_PX }}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={maxSec}
        aria-valuenow={inSec}
        aria-label="Slip source in point"
      >
        <div className="absolute inset-0 flex">
          {Array.from({ length: Math.ceil(maxSec / 10) }, (_, i) => (
            <div
              key={i}
              className="flex-shrink-0 border-r border-border/50"
              style={{ width: (10 / maxSec) * STRIP_WIDTH_PX }}
            />
          ))}
        </div>
        <div
          className="absolute top-0 bottom-0 bg-primary/40 border border-primary rounded pointer-events-none"
          style={{
            left: windowLeftPx,
            width: windowWidthPx,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
          {inSec.toFixed(1)}s – {outSec.toFixed(1)}s
        </div>
      </div>
    </div>
  );
}
