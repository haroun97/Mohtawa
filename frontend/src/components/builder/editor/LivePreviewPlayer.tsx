import { useRef, useEffect, useCallback, useState, type RefObject, type MutableRefObject } from 'react';
import { Play } from 'lucide-react';
import { buildPreviewFilter } from './editorLib';
import type { EDL, EdlTimelineClip, EdlTextOverlay } from '@/lib/api';

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

function isPlayableUrl(url: string): boolean {
  return Boolean(
    url &&
      (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:'))
  );
}

/** Find clip index and source time for a given timeline position. At timeline end, returns last clip at its end. */
function getClipAtTime(
  timeline: EdlTimelineClip[],
  timeSec: number
): { index: number; sourceTimeSec: number } | null {
  if (timeline.length === 0) return null;
  const total = getTotalDuration(timeline);
  if (timeSec >= total) {
    const last = timeline[timeline.length - 1];
    return { index: timeline.length - 1, sourceTimeSec: Math.max(last.inSec, last.outSec - 0.05) };
  }
  for (let i = 0; i < timeline.length; i++) {
    const clip = timeline[i];
    const duration = Math.max(0.04, clip.outSec - clip.inSec);
    const segEnd = clip.startSec + duration;
    if (timeSec >= clip.startSec && timeSec < segEnd) {
      const sourceTimeSec = clip.inSec + (timeSec - clip.startSec);
      return { index: i, sourceTimeSec };
    }
  }
  return null;
}

function getTotalDuration(timeline: EdlTimelineClip[]): number {
  return timeline.reduce(
    (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
    0
  );
}

interface LivePreviewPlayerProps {
  timeline: EdlTimelineClip[];
  resolvedClipUrls: (string | null)[];
  playheadSec: number;
  onTimeUpdate: (timelineSec: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  edlColor: EDL['color'];
  overlays?: EdlTextOverlay[];
  /** When set, overlay with this id is shown as selected (clip-selected). */
  selectedOverlayId?: string | null;
  /** Called when user clicks an overlay on the preview. */
  onSelectOverlay?: (overlayId: string) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  className?: string;
  /** Resolved playable voiceover URL (e.g. presigned). When set, played in sync with video. */
  voiceoverUrl?: string | null;
  videoTrackMuted?: boolean;
  audioTrackMuted?: boolean;
  voiceVolume?: number;
  /** When set, updated with raw timeline time on every timeupdate (for smooth playhead RAF without re-renders). */
  playheadSecRef?: MutableRefObject<number>;
}

export function LivePreviewPlayer({
  timeline,
  resolvedClipUrls,
  playheadSec,
  onTimeUpdate,
  onDurationChange,
  onPlayingChange,
  edlColor,
  overlays = [],
  selectedOverlayId = null,
  onSelectOverlay,
  videoRef: externalRef,
  className = '',
  voiceoverUrl: resolvedVoiceoverUrl = null,
  videoTrackMuted = false,
  audioTrackMuted = false,
  voiceVolume = 1,
  playheadSecRef,
}: LivePreviewPlayerProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (externalRef ?? internalRef) as MutableRefObject<HTMLVideoElement | null>;
  const voiceoverAudioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlayingState] = useState(false);
  const setPlaying = useCallback(
    (value: boolean) => {
      setPlayingState(value);
      onPlayingChange?.(value);
    },
    [onPlayingChange]
  );
  const activeClipIndexRef = useRef<number | null>(null);

  const totalDuration = getTotalDuration(timeline);
  const clipAtPlayhead = getClipAtTime(timeline, playheadSec);
  const currentClipUrl =
    clipAtPlayhead && (() => {
      const url = resolvedClipUrls[clipAtPlayhead.index] ?? timeline[clipAtPlayhead.index]?.clipUrl ?? '';
      return url && isPlayableUrl(url) ? url : '';
    })();

  const setRef = useCallback(
    (el: HTMLVideoElement | null) => {
      internalRef.current = el;
      if (externalRef) (externalRef as MutableRefObject<HTMLVideoElement | null>).current = el;
    },
    [externalRef]
  );

  // Report total duration when timeline changes
  useEffect(() => {
    onDurationChange?.(totalDuration);
  }, [totalDuration, onDurationChange]);

  // Apply video track mute: clip audio is muted when videoTrackMuted is true
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = videoTrackMuted;
  }, [videoTrackMuted, videoRef, currentClipUrl]);

  // Sync voiceover position when playhead changes (scrubbing only; when playing, timeupdate handler drives sync)
  const hasVoiceover = Boolean(resolvedVoiceoverUrl && isPlayableUrl(resolvedVoiceoverUrl));
  useEffect(() => {
    if (!hasVoiceover || playing) return;
    const audio = voiceoverAudioRef.current;
    if (!audio) return;
    audio.currentTime = playheadSec;
  }, [playheadSec, hasVoiceover, playing]);

  // Voiceover volume and mute
  useEffect(() => {
    const audio = voiceoverAudioRef.current;
    if (!audio) return;
    audio.volume = audioTrackMuted ? 0 : voiceVolume;
    audio.muted = audioTrackMuted;
  }, [voiceVolume, audioTrackMuted]);

  // Keep active clip index in sync; when scrubbing (same clip), seek video to source time
  useEffect(() => {
    if (!clipAtPlayhead) return;
    activeClipIndexRef.current = clipAtPlayhead.index;

    const video = videoRef.current;
    if (!video || !currentClipUrl) return;
    if (!playing && Math.abs(video.currentTime - clipAtPlayhead.sourceTimeSec) > 0.2) {
      video.currentTime = clipAtPlayhead.sourceTimeSec;
    }
  }, [clipAtPlayhead, playing, currentClipUrl, videoRef]);

  // Playback: map video time to timeline time; switch clip at boundary; sync voiceover on timeupdate (no per-frame seek)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || timeline.length === 0) return;

    const boundaryEpsilon = 0.15;

    const onTimeUpdateLocal = () => {
      const index = activeClipIndexRef.current;
      if (index === null || index >= timeline.length) return;
      const clip = timeline[index];
      const t = video.currentTime;
      const rawTimelineSec = clip.startSec + (t - clip.inSec);
      const timelineSec = Math.round(rawTimelineSec * 20) / 20;

      if (playheadSecRef) playheadSecRef.current = rawTimelineSec;
      onTimeUpdate(timelineSec);

      // Do not set voiceover currentTime here — repeated seeks cause glitches. Sync only on play/pause/clip switch.

      if (t >= clip.outSec - boundaryEpsilon) {
        video.pause();
        const nextIndex = index + 1;
        if (nextIndex < timeline.length) {
          const nextClip = timeline[nextIndex];
          const nextUrl = resolvedClipUrls[nextIndex] ?? nextClip.clipUrl;
          if (nextUrl && isPlayableUrl(nextUrl)) {
            activeClipIndexRef.current = nextIndex;
            onTimeUpdate(nextClip.startSec);
            const voiceoverAudio = voiceoverAudioRef.current;
            if (voiceoverAudio && hasVoiceover) voiceoverAudio.currentTime = nextClip.startSec;
            video.src = nextUrl;
            video.currentTime = nextClip.inSec;
            video.play().catch(() => {});
          } else {
            onTimeUpdate(clip.startSec + (clip.outSec - clip.inSec));
          }
        } else {
          onTimeUpdate(totalDuration);
        }
      }
    };

    video.addEventListener('timeupdate', onTimeUpdateLocal);
    return () => video.removeEventListener('timeupdate', onTimeUpdateLocal);
  }, [timeline, resolvedClipUrls, totalDuration, onTimeUpdate, videoRef, hasVoiceover, playheadSecRef]);

  useEffect(() => {
    const video = videoRef.current;
    const voiceoverAudio = voiceoverAudioRef.current;
    if (!video) return;
    const onPlay = () => {
      setPlaying(true);
      if (voiceoverAudio && hasVoiceover) {
        const index = activeClipIndexRef.current;
        if (index !== null && index < timeline.length) {
          const clip = timeline[index];
          const timelineSec = clip.startSec + (video.currentTime - clip.inSec);
          voiceoverAudio.currentTime = timelineSec;
        }
        voiceoverAudio.play().catch(() => {});
      }
    };
    const onPause = () => {
      setPlaying(false);
      voiceoverAudio?.pause();
      // Push final playhead so UI is exact when user pauses
      const index = activeClipIndexRef.current;
      if (index !== null && index < timeline.length) {
        const clip = timeline[index];
        const sec = clip.startSec + (video.currentTime - clip.inSec);
        onTimeUpdate(Math.min(sec, totalDuration));
      }
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    setPlaying(!video.paused);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoRef, hasVoiceover, timeline, totalDuration, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const voiceoverAudio = voiceoverAudioRef.current;
    if (video.paused) {
      if (!clipAtPlayhead) return;
      const url = resolvedClipUrls[clipAtPlayhead.index] ?? timeline[clipAtPlayhead.index]?.clipUrl;
      if (url && isPlayableUrl(url)) {
        if (video.src !== url || !video.src) {
          video.src = url;
          video.currentTime = clipAtPlayhead.sourceTimeSec;
          video.load();
          video.addEventListener(
            'canplay',
            () => {
              video.play().catch(() => {});
              if (voiceoverAudio && hasVoiceover) {
                voiceoverAudio.currentTime = playheadSec;
                voiceoverAudio.play().catch(() => {});
              }
            },
            { once: true }
          );
        } else {
          video.currentTime = clipAtPlayhead.sourceTimeSec;
          video.play().catch(() => {});
          if (voiceoverAudio && hasVoiceover) {
            voiceoverAudio.currentTime = playheadSec;
            voiceoverAudio.play().catch(() => {});
          }
        }
      }
    } else {
      video.pause();
      voiceoverAudio?.pause();
    }
  }, [clipAtPlayhead, timeline, resolvedClipUrls, videoRef, hasVoiceover, playheadSec]);

  const visibleOverlays = overlays.filter(
    (o) => playheadSec >= o.startSec && playheadSec <= o.endSec
  );

  const showVideo = clipAtPlayhead && (() => {
    const url = resolvedClipUrls[clipAtPlayhead.index] ?? timeline[clipAtPlayhead.index]?.clipUrl;
    return url && isPlayableUrl(url);
  })();

  return (
    <div
      className={`flex items-center justify-center rounded-xl overflow-hidden bg-black ${className}`}
    >
      <div className="relative w-full max-w-full aspect-[9/16] flex items-center justify-center bg-black overflow-hidden rounded-lg">
        {timeline.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
        ) : showVideo ? (
          <>
            {hasVoiceover && (
              <audio
                ref={voiceoverAudioRef}
                src={resolvedVoiceoverUrl ?? undefined}
                preload="auto"
                className="hidden"
                aria-hidden
              />
            )}
            <video
              ref={setRef}
              key="preview-video"
              src={currentClipUrl}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ filter: buildPreviewFilter(edlColor) }}
              preload="metadata"
              onClick={togglePlay}
              playsInline
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v && clipAtPlayhead) v.currentTime = clipAtPlayhead.sourceTimeSec;
              }}
            />
            {/* Safe-area guide (template) */}
            <div className="absolute inset-4 safe-area-guide rounded-xl pointer-events-none" />
            <div className="absolute inset-0 flex flex-col justify-between py-[10%] px-[6%]">
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
                      const id = o.id ?? `overlay-${i}`;
                      const isSelected = selectedOverlayId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOverlay?.(id);
                          }}
                          className={`pointer-events-auto cursor-pointer px-3 py-1.5 rounded-lg transition-all duration-150 text-left ${
                            isSelected ? 'clip-selected bg-editor-surface/60' : 'bg-editor-surface/40 hover:bg-editor-surface/50'
                          }`}
                        >
                          <span
                            className="whitespace-pre-wrap break-words max-w-full"
                            style={style}
                          >
                            {o.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-[opacity] duration-200 ease-out hover:bg-black/30"
              style={{ opacity: playing ? 0 : 1, pointerEvents: playing ? 'none' : 'auto' }}
              aria-label="Play"
            >
              <div className="w-14 h-14 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center">
                <Play size={24} className="text-foreground ml-1" />
              </div>
            </button>
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
