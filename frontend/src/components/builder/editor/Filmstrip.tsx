import { useRef, useCallback, useEffect } from 'react';

/** Number of placeholder cells shown along the strip. */
const CELLS = 24;

interface FilmstripProps {
  /** Total source duration (seconds) shown on the strip. */
  sourceDurationSec: number;
  /** Current source in point (seconds). */
  inSec: number;
  /** Length of the selected segment (seconds). */
  segmentDurationSec: number;
  /** Callback when user drags to a new in point. */
  onSlipChange: (newInSec: number) => void;
  /** Optional thumbnail URLs for the strip (future use). */
  thumbUrls?: (string | null)[];
}

export function Filmstrip({
  sourceDurationSec,
  inSec,
  segmentDurationSec,
  onSlipChange,
  thumbUrls = [],
}: FilmstripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startInSec: number; pxPerSec: number } | null>(null);

  const maxInSec = Math.max(0, sourceDurationSec - segmentDurationSec);
  const clampedInSec = Math.max(0, Math.min(maxInSec, inSec));
  const pxPerSec = sourceDurationSec > 0 ? 1 / sourceDurationSec : 0; // fraction of strip width per second

  const handleMove = useCallback(
    (clientX: number) => {
      const d = dragRef.current;
      if (!d || !stripRef.current) return;
      const rect = stripRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const deltaSec = (x - d.startX) / d.pxPerSec;
      const newInSec = Math.max(0, Math.min(maxInSec, d.startInSec + deltaSec));
      onSlipChange(newInSec);
    },
    [maxInSec, onSlipChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => handleMove(e.clientX),
    [handleMove]
  );
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      if (t) handleMove(t.clientX);
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleEnd);
    window.removeEventListener('touchmove', handleTouchMove, { capture: true });
    window.removeEventListener('touchend', handleEnd);
    window.removeEventListener('touchcancel', handleEnd);
  }, [handleMouseMove, handleTouchMove]);

  const startDrag = useCallback(
    (clientX: number) => {
      if (!stripRef.current) return;
      const rect = stripRef.current.getBoundingClientRect();
      const pxPerSec = rect.width / sourceDurationSec;
      dragRef.current = {
        startX: clientX - rect.left,
        startInSec: clampedInSec,
        pxPerSec: pxPerSec || 1,
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    },
    [clampedInSec, sourceDurationSec, handleMouseMove, handleTouchMove, handleEnd]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(e.clientX);
    },
    [startDrag]
  );
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (t) startDrag(t.clientX);
    },
    [startDrag]
  );

  useEffect(() => () => {
    if (dragRef.current) {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    }
  }, [handleMouseMove, handleTouchMove, handleEnd]);

  const selectionLeftPercent = sourceDurationSec > 0 ? (clampedInSec / sourceDurationSec) * 100 : 0;
  const selectionWidthPercent =
    sourceDurationSec > 0 ? (segmentDurationSec / sourceDurationSec) * 100 : 10;

  return (
    <div
      ref={stripRef}
      className="relative w-full h-14 rounded-lg overflow-hidden bg-black/60 cursor-ew-resize select-none touch-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={maxInSec}
      aria-valuenow={clampedInSec}
      aria-label="Slip source in point"
    >
      <div className="absolute inset-0 flex">
        {Array.from({ length: CELLS }, (_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-white/10 last:border-0 flex items-center justify-center"
          >
            {thumbUrls[i] ? (
              <img
                src={thumbUrls[i]}
                alt=""
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-muted/50" />
            )}
          </div>
        ))}
      </div>
      {/* Dimmed areas outside selection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.6) ${selectionLeftPercent}%, transparent ${selectionLeftPercent}%, transparent ${selectionLeftPercent + selectionWidthPercent}%, rgba(0,0,0,0.6) ${selectionLeftPercent + selectionWidthPercent}%, rgba(0,0,0,0.6) 100%)`,
        }}
      />
      {/* Yellow-bordered selection window */}
      <div
        className="absolute top-0 bottom-0 border-2 border-yellow-400 rounded shadow-lg pointer-events-none box-border"
        style={{
          left: `${selectionLeftPercent}%`,
          width: `${selectionWidthPercent}%`,
        }}
      />
    </div>
  );
}
