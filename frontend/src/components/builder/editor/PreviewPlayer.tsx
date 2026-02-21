import { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import { Play } from 'lucide-react';
import { buildPreviewFilter } from './editorLib';
import type { EDL, EdlTextOverlay } from '@/lib/api';

function overlayStyles(preset?: string): React.CSSProperties & { className?: string } {
  switch (preset) {
    case 'yellow_caption':
      return {
        color: '#fef08a',
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        fontSize: 'clamp(14px, 4vw, 22px)',
      };
    case 'minimal_lower':
      return {
        color: 'rgba(255,255,255,0.95)',
        fontWeight: 500,
        fontSize: 'clamp(12px, 3.5vw, 18px)',
        letterSpacing: '0.02em',
      };
    case 'bold_white_shadow':
    default:
      return {
        color: '#fff',
        fontWeight: 700,
        textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.5)',
        fontSize: 'clamp(16px, 4.5vw, 24px)',
      };
  }
}

interface PreviewPlayerProps {
  playUrl: string | null;
  edlColor: EDL['color'];
  overlays?: EdlTextOverlay[];
  playheadSec?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  className?: string;
}

export function PreviewPlayer({
  playUrl,
  edlColor,
  overlays = [],
  playheadSec = 0,
  onTimeUpdate,
  onDurationChange,
  videoRef: externalRef,
  className = '',
}: PreviewPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalRef;
  const [playing, setPlaying] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      const ref = videoRef as React.MutableRefObject<HTMLVideoElement | null>;
      ref.current = el;
      setVideoReady(!!el);
    },
    [videoRef]
  );

  useEffect(() => {
    if (!playUrl) setVideoReady(false);
  }, [playUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    const onTime = () => onTimeUpdate?.(video.currentTime);
    const onDur = () => onDurationChange?.(video.duration || 0);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onDur);
    video.addEventListener('durationchange', onDur);
    onDur();
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onDur);
      video.removeEventListener('durationchange', onDur);
    };
  }, [playUrl, videoReady, onTimeUpdate, onDurationChange, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setPlaying(!video.paused);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [playUrl, videoReady, videoRef]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const visibleOverlays = overlays.filter(
    (o) => playheadSec >= o.startSec && playheadSec <= o.endSec
  );

  return (
    <div
      className={`flex items-center justify-center rounded-xl overflow-hidden bg-black ${className}`}
    >
      {/* Strict 9:16 canvas with dark background */}
      <div className="relative w-full max-w-full aspect-[9/16] flex items-center justify-center bg-black overflow-hidden rounded-lg">
        {playUrl ? (
          <>
            <video
              ref={setRef}
              key={playUrl}
              src={playUrl}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: buildPreviewFilter(edlColor) }}
              preload="metadata"
              onClick={togglePlay}
              playsInline
            />
            {/* Live text overlays */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between py-[10%] px-[6%]">
              {['top', 'center', 'bottom'].map((pos) => {
                const atPos = visibleOverlays.filter(
                  (o) => (o.position ?? 'center') === pos
                );
                if (atPos.length === 0)
                  return <div key={pos} className="min-h-[1.2em]" />;
                const justify =
                  pos === 'top'
                    ? 'justify-start'
                    : pos === 'bottom'
                      ? 'justify-end'
                      : 'justify-center';
                return (
                  <div
                    key={pos}
                    className={`flex flex-col ${justify} items-center text-center w-full gap-1 min-h-[1.2em]`}
                  >
                    {atPos.map((o, i) => {
                      const style = overlayStyles(
                        o.stylePreset ?? 'bold_white_shadow'
                      );
                      return (
                        <span
                          key={o.id ?? i}
                          className="whitespace-pre-wrap break-words max-w-full"
                          style={style}
                        >
                          {o.text}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {/* Minimal play/pause indicator (only when paused) */}
            {!playing && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                <span className="rounded-full bg-black/50 p-4 flex items-center justify-center">
                  <Play className="h-10 w-10 text-white" />
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
        )}
      </div>
    </div>
  );
}
