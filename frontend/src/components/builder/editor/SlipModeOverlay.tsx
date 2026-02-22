import { useRef, useEffect } from 'react';
import { Filmstrip } from './Filmstrip';
import { SlipFooter } from './SlipFooter';
import type { EdlTimelineClip } from '@/lib/api';

interface SlipModeOverlayProps {
  clip: EdlTimelineClip;
  clipIndex: number;
  /** Resolved playable URL for this clip. */
  resolvedClipUrl: string | null;
  setClipSlipInAbsolute: (index: number, newInSec: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SlipModeOverlay({
  clip,
  clipIndex,
  resolvedClipUrl,
  setClipSlipInAbsolute,
  onConfirm,
  onCancel,
}: SlipModeOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inSec = clip.inSec;
  const segmentDurationSec = Math.max(0.04, clip.outSec - clip.inSec);
  const sourceDurationSec = clip.sourceDurationSec ?? clip.outSec + 300;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const target = inSec;
    if (Math.abs(video.currentTime - target) > 0.15) {
      video.currentTime = target;
    }
  }, [inSec]);

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Slip mode: choose source portion"
    >
      {/* Top: 9:16 preview */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4">
        <div className="w-full max-w-[280px] aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center">
          {resolvedClipUrl ? (
            <video
              ref={videoRef}
              src={resolvedClipUrl}
              className="w-full h-full object-contain"
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                v.currentTime = inSec;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No preview
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          {inSec.toFixed(1)}s – {(inSec + segmentDurationSec).toFixed(1)}s
        </p>
      </div>

      {/* Filmstrip */}
      <div className="flex-shrink-0 px-4 py-3 w-full max-w-lg mx-auto">
        <Filmstrip
          sourceDurationSec={sourceDurationSec}
          inSec={inSec}
          segmentDurationSec={segmentDurationSec}
          onSlipChange={(newInSec) => setClipSlipInAbsolute(clipIndex, newInSec)}
        />
      </div>

      <SlipFooter onCancel={onCancel} onConfirm={onConfirm} />
    </div>
  );
}
