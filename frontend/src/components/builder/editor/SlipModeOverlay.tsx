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
      className="fixed inset-0 z-[300] flex flex-col bg-editor-bg animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Slip mode: choose source portion"
    >
      {/* Top: 9:16 preview (template style) */}
      <div className="flex-1 flex items-center justify-center px-4 py-3 min-h-0">
        <div className="relative w-full max-w-[240px] md:max-w-[280px] bg-editor-preview rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}>
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
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              No preview
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-editor-surface/80 backdrop-blur-sm">
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
              {inSec.toFixed(2)}s — {(inSec + segmentDurationSec).toFixed(2)}s
            </span>
          </div>
        </div>
      </div>

      {/* Filmstrip */}
      <div className="flex-shrink-0 px-4 py-4 w-full max-w-lg mx-auto">
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
