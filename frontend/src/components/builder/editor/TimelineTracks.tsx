import React, { useRef, useEffect, useCallback, useState, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Film, Type, Music, Plus, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import type { EDL, EdlTimelineClip, EdlTextOverlay } from '@/lib/api';
import { edlEditorStore } from '@/store/edlEditorStore';
import { VideoThumbnailStrip } from './VideoThumbnailStrip';
import { useAudioPeaks } from './useAudioPeaks';
import { AudioWaveformCanvas } from './AudioWaveformCanvas';

const PIXELS_PER_SECOND = 80;

/** Decorative fallback when no peak data (slim bars). */
function AudioWaveformStripPlaceholder({ widthPx }: { widthPx: number }) {
  const barCount = Math.max(4, Math.floor(widthPx / 5));
  return (
    <div className="flex items-center h-full gap-0.5 px-1 flex-1 min-w-0">
      {Array.from({ length: barCount }).map((_, i) => {
        const height = 28 + Math.sin(i * 0.8) * 32 + ((i * 17) % 28);
        return (
          <div
            key={i}
            className="flex-shrink-0 w-[1px] rounded-full bg-audio-waveform/50"
            style={{ height: `${Math.min(85, height)}%` }}
          />
        );
      })}
    </div>
  );
}

/** Waveform from decoded peak data; minimal bars, subtle pink/purple 0.85 opacity. */
function AudioWaveformFromPeaks({ peaks, widthPx }: { peaks: number[]; widthPx: number }) {
  const barCount = Math.max(4, Math.min(peaks.length, Math.floor(widthPx / 2)));
  const step = peaks.length / barCount;
  return (
    <div className="flex items-center h-full gap-px px-1 flex-1 min-w-0">
      {Array.from({ length: barCount }).map((_, i) => {
        const idx = Math.min(Math.floor(i * step), peaks.length - 1);
        const p = peaks[idx] ?? 0;
        const heightPct = Math.min(95, 15 + p * 80);
        return (
          <div
            key={i}
            className="flex-shrink-0 w-[1px] rounded-full bg-audio-waveform/[0.85]"
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
const TRACK_HEIGHT = 32;
const WAVEFORM_TRACK_INNER_HEIGHT = 24; // height available for waveform inside audio track row
const RULER_HEIGHT = 22;
const TRACK_LABEL_WIDTH_PX = 48; // w-12, compact labels

interface TimelineTracksProps {
  edl: EDL;
  playheadSec: number;
  /** When provided, used as target for smooth playhead (RAF); avoids re-renders on every timeupdate. */
  playheadSecRef?: RefObject<number>;
  videoDuration: number;
  /** Resolved playable URLs for timeline clips (index matches edl.timeline). Enables thumbnails for S3 clips. */
  resolvedClipUrls?: (string | null)[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSelectClip: (index: number) => void;
  setClipTrim: (index: number, field: 'inSec' | 'outSec', value: number) => void;
  setOverlayTrim?: (overlayIndex: number, field: 'startSec' | 'endSec', value: number) => void;
  onSeek?: (sec: number) => void;
  dragOverIndex: number | null;
  draggingIndex: number | null;
  setDragOverIndex: (i: number | null) => void;
  setDraggingIndex: (i: number | null) => void;
  /** When true, trim UI is active (e.g. Trim sheet open); show dimmed overlay and ring on timeline. */
  trimActive?: boolean;
  /** Optional playable audio URL for waveform extraction (e.g. edl.audio.voiceoverUrl or resolved URL). */
  audioUrl?: string | null;
  /** Called when track mute state changes (e.g. from timeline volume icon click). */
  onEdlChange?: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}

interface SortableVideoClipProps {
  clip: EdlTimelineClip;
  index: number;
  totalDuration: number;
  isSelected: boolean;
  onSelect: () => void;
  setClipTrim: (index: number, field: 'inSec' | 'outSec', value: number) => void;
  /** Resolved playable URL for this clip (presigned if S3). Falls back to clip.clipUrl if not provided. */
  playableUrl: string | null;
}

const SortableVideoClip = React.forwardRef<HTMLDivElement, SortableVideoClipProps>(function SortableVideoClip({
  clip,
  index,
  totalDuration,
  isSelected,
  onSelect,
  setClipTrim,
  playableUrl,
}, ref) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `clip-${clip.id ?? index}` });
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [setNodeRef, ref]
  );
  const duration = Math.max(0.04, clip.outSec - clip.inSec);
  const widthPx = totalDuration > 0 ? duration * PIXELS_PER_SECOND - 2 : 48;
  const style = transform
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined;

  const MIN_CLIP_DURATION = 0.04;
  const handleTrimLeftClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const step = 0.1;
      const newIn = Math.min(clip.inSec + step, clip.outSec - MIN_CLIP_DURATION);
      setClipTrim(index, 'inSec', newIn);
    },
    [clip.inSec, clip.outSec, index, setClipTrim]
  );
  const handleTrimRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const step = 0.1;
      const newOut = Math.max(clip.outSec - step, clip.inSec + MIN_CLIP_DURATION);
      setClipTrim(index, 'outSec', newOut);
    },
    [clip.inSec, clip.outSec, index, setClipTrim]
  );

  const trimDragRef = useRef<{ side: 'left' | 'right'; startX: number; startIn: number; startOut: number } | null>(null);
  const handleTrimLeftMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      trimDragRef.current = { side: 'left', startX: e.clientX, startIn: clip.inSec, startOut: clip.outSec };
      const onMove = (ev: MouseEvent) => {
        const d = trimDragRef.current;
        if (!d || d.side !== 'left') return;
        const deltaSec = (ev.clientX - d.startX) / PIXELS_PER_SECOND;
        const newIn = Math.max(0, Math.min(d.startOut - MIN_CLIP_DURATION, d.startIn + deltaSec));
        setClipTrim(index, 'inSec', newIn);
      };
      const onUp = () => {
        trimDragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [clip.inSec, clip.outSec, index, setClipTrim]
  );
  const handleTrimRightMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      trimDragRef.current = { side: 'right', startX: e.clientX, startIn: clip.inSec, startOut: clip.outSec };
      const onMove = (ev: MouseEvent) => {
        const d = trimDragRef.current;
        if (!d || d.side !== 'right') return;
        const deltaSec = (ev.clientX - d.startX) / PIXELS_PER_SECOND;
        const newOut = Math.max(d.startIn + MIN_CLIP_DURATION, Math.min(86400, d.startOut + deltaSec));
        setClipTrim(index, 'outSec', newOut);
      };
      const onUp = () => {
        trimDragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [clip.inSec, clip.outSec, index, setClipTrim]
  );

  return (
    <motion.div
      ref={mergedRef}
      layout
      data-track-clip
      style={{ ...style, width: Math.max(40, widthPx), height: TRACK_HEIGHT - 8 }}
      className={`
        flex shrink-0 items-stretch rounded-md border-2 transition-colors relative min-w-[40px] touch-pan-x
        ${isSelected ? 'clip-selected border-selection bg-selection/10 overflow-visible' : 'overflow-hidden border-border bg-editor-surface hover:bg-editor-surface-hover'}
        ${isDragging ? 'opacity-60 z-50' : ''}
      `}
      onClick={() => onSelect()}
    >
      {isSelected && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-selection text-selection-foreground z-10 whitespace-nowrap">
          {duration.toFixed(1)}s
        </div>
      )}
      {isSelected && (
        <>
          <button
            type="button"
            className="absolute left-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-r border-primary/50"
            onClick={handleTrimLeftClick}
            onMouseDown={handleTrimLeftMouseDown}
            title="Trim start (drag)"
          >
            <div className="w-1 h-4 rounded-full bg-primary-foreground/80" />
          </button>
          <button
            type="button"
            className="absolute right-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-l border-primary/50"
            onClick={handleTrimRightClick}
            onMouseDown={handleTrimRightMouseDown}
            title="Trim end (drag)"
          >
            <div className="w-1 h-4 rounded-full bg-primary-foreground/80" />
          </button>
        </>
      )}
      <div className="flex-1 min-w-0 flex items-center pl-6 pr-6 pointer-events-none">
        <VideoThumbnailStrip
          clipUrl={playableUrl ?? clip.clipUrl}
          inSec={clip.inSec}
          outSec={clip.outSec}
          widthPx={widthPx}
          heightPx={TRACK_HEIGHT - 8}
        />
      </div>
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none w-6 h-full min-h-[24px] -ml-1 z-[1]"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground pointer-events-none" />
      </div>
    </motion.div>
  );
});

export function TimelineTracks({
  edl,
  playheadSec,
  playheadSecRef,
  videoDuration,
  resolvedClipUrls = [],
  onReorder,
  onSelectClip,
  setClipTrim,
  setOverlayTrim,
  onSeek,
  dragOverIndex,
  draggingIndex,
  setDragOverIndex,
  setDraggingIndex,
  trimActive = false,
  audioUrl = null,
  onEdlChange,
}: TimelineTracksProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalDurationForPeaks = edl.timeline.reduce((acc, c) => acc + Math.max(0.04, c.outSec - c.inSec), 0);
  const widthForPeaks = Math.max(120, totalDurationForPeaks * PIXELS_PER_SECOND - 16);
  const { peaks: audioPeaks } = useAudioPeaks(audioUrl, 400);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollLeftRef = useRef(0);
  scrollLeftRef.current = scrollLeft;
  const displaySecRef = useRef(playheadSec);
  const playheadElRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  // When playheadSecRef is provided, RAF reads from it (updated every timeupdate); else use playheadSec.
  const playheadTargetRef = useRef(playheadSec);
  playheadTargetRef.current = playheadSec;

  // Snap display on seek (large jump) so we don't lerp from stale value
  if (Math.abs(playheadSec - displaySecRef.current) > 0.5) {
    displaySecRef.current = playheadSec;
  }

  // Smooth playhead: RAF updates transform only (no React state) to avoid re-renders and flicker
  useEffect(() => {
    const applyPlayheadTransform = () => {
      const el = playheadElRef.current;
      if (el) {
        const sec = displaySecRef.current;
        el.style.transform = `translateX(${sec * PIXELS_PER_SECOND}px) translateX(-50%)`;
      }
    };
    applyPlayheadTransform();
    function tick() {
      const target = playheadSecRef != null ? playheadSecRef.current : playheadTargetRef.current;
      const current = displaySecRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 0.0005) {
        displaySecRef.current = target;
      } else {
        displaySecRef.current = current + diff * 0.25;
      }
      applyPlayheadTransform();
      rafIdRef.current = requestAnimationFrame(tick);
    }
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const selectedBlock = edlEditorStore((s) => s.selectedBlock);
  const setSelectedBlock = edlEditorStore((s) => s.setSelectedBlock);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);

  const totalDuration = edl.timeline.reduce(
    (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
    0
  );
  const contentWidth = Math.max(totalDuration * PIXELS_PER_SECOND, 400);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const videoClipIds = edl.timeline.map((c, i) => `clip-${c.id ?? i}`);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = videoClipIds.indexOf(active.id as string);
        const newIndex = videoClipIds.indexOf(over.id as string);
        if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex);
      }
      setDragOverIndex(null);
      setDraggingIndex(null);
    },
    [onReorder, setDragOverIndex, setDraggingIndex, videoClipIds]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || videoDuration <= 0) return;
    const playheadCenter = TRACK_LABEL_WIDTH_PX + playheadSec * PIXELS_PER_SECOND;
    const viewportCenter = el.clientWidth / 2;
    const targetScroll = playheadCenter - viewportCenter;
    const newScrollLeft = Math.max(0, targetScroll);
    if (el.scrollLeft !== newScrollLeft) {
      el.scrollLeft = newScrollLeft;
      setScrollLeft(newScrollLeft);
    }
  }, [playheadSec, videoDuration]);

  const handleTrackContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (onSeek && e.currentTarget) {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const contentX = el.scrollLeft + (e.clientX - rect.left);
        const timeX = contentX - TRACK_LABEL_WIDTH_PX;
        const sec = Math.max(0, Math.min(totalDuration, timeX / PIXELS_PER_SECOND));
        onSeek(sec);
      }
      const isInteractive =
        (e.target as HTMLElement).closest('button') != null ||
        (e.target as HTMLElement).closest('[data-track-clip]') != null;
      if (!isInteractive) setSelectedBlock(null);
    },
    [onSeek, totalDuration, setSelectedBlock]
  );

  const ticks: number[] = [];
  for (let t = 0; t <= Math.ceil(totalDuration); t++) {
    ticks.push(t);
  }
  const halfTicks: number[] = [];
  for (let t = 0; t < Math.ceil(totalDuration); t++) {
    halfTicks.push(t + 0.5);
  }

  return (
    <div
      className={`flex flex-col gap-0 rounded-lg border border-border/30 bg-editor-timeline/90 overflow-hidden min-w-0 no-scrollbar relative ${trimActive ? 'ring-2 ring-selection/20' : ''}`}
    >
      {trimActive && (
        <div className="absolute inset-0 bg-background/20 pointer-events-none z-10 rounded-lg" aria-hidden />
      )}
      <div className="relative flex-1 min-h-0 min-w-0">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden touch-pan-x min-w-0 smooth-scroll [-webkit-overflow-scrolling:touch] no-scrollbar"
          style={{ height: RULER_HEIGHT + 5 * TRACK_HEIGHT + 24 }}
          onClick={handleTrackContentClick}
          onScroll={() => setScrollLeft(scrollRef.current?.scrollLeft ?? 0)}
        >
          <div className="relative flex flex-col" style={{ width: contentWidth, minWidth: contentWidth }}>
            <div
              className="flex-shrink-0 border-b border-border/40 bg-editor-surface/40 px-2 text-muted-foreground flex items-stretch ml-2"
              style={{ height: RULER_HEIGHT, minHeight: RULER_HEIGHT }}
            >
              <div className="w-12 flex-shrink-0" aria-hidden />
              <div className="flex h-full items-end gap-0 relative">
                {ticks.map((t) => (
                  <div
                    key={`full-${t}`}
                    className="flex-shrink-0 flex flex-col items-center relative"
                    style={{ width: PIXELS_PER_SECOND }}
                  >
                    <span className="text-[8px] font-medium text-muted-foreground/90">{t}s</span>
                  </div>
                ))}
                {halfTicks.map((t) => (
                  <div
                    key={`half-${t}`}
                    className="absolute top-0 bottom-0 w-px flex-shrink-0 bg-muted-foreground/20"
                    style={{ left: t * PIXELS_PER_SECOND - 1, width: 1 }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>

            <div className="relative flex flex-col flex-1" style={{ minHeight: 5 * TRACK_HEIGHT }}>
              {/* Track 1: Text */}
              <div className="flex items-center border-b border-border/30 relative" style={{ height: TRACK_HEIGHT }}>
                <div className="w-12 flex-shrink-0 pl-1 flex items-center justify-center">
                  <Type className="h-4 w-4 text-muted-foreground/80" aria-hidden />
                </div>
                <div className="flex-1 relative py-1 pr-2" style={{ minHeight: TRACK_HEIGHT - 8 }}>
                  {edl.overlays.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBlock({ type: 'text', id: '' });
                        setActiveTool('captions');
                      }}
                      className={`rounded-md border-2 flex items-center justify-center min-w-[44px] cursor-pointer transition-colors
                        ${selectedBlock?.type === 'text' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-text-layer/40 bg-text-layer/30 hover:bg-text-layer/40'}
                      `}
                      style={{ width: Math.max(120, totalDuration * PIXELS_PER_SECOND - 8) }}
                      title="Add text overlays / captions"
                      aria-label="Add captions"
                    >
                      <Type className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    </button>
                  ) : (
                    edl.overlays.map((o, i) => {
                      const overlay = o as EdlTextOverlay;
                      const overlayId = overlay.id ?? `overlay-${i}`;
                      const duration = Math.max(0.1, overlay.endSec - overlay.startSec);
                      const width = Math.max(24, duration * PIXELS_PER_SECOND);
                      const left = overlay.startSec * PIXELS_PER_SECOND;
                      const isSelected = selectedBlock?.type === 'text' && selectedBlock.id === overlayId;
                      const MIN_OVERLAY_DURATION = 0.1;
                      const handleOverlayTrimStartClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const newStart = Math.min(overlay.startSec + 0.1, overlay.endSec - MIN_OVERLAY_DURATION);
                        setOverlayTrim?.(i, 'startSec', newStart);
                      };
                      const handleOverlayTrimEndClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const newEnd = Math.max(overlay.endSec - 0.1, overlay.startSec + MIN_OVERLAY_DURATION);
                        setOverlayTrim?.(i, 'endSec', newEnd);
                      };
                      const handleOverlayTrimLeftMouseDown = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startStart = overlay.startSec;
                        const startEnd = overlay.endSec;
                        const onMove = (ev: MouseEvent) => {
                          const deltaSec = (ev.clientX - startX) / PIXELS_PER_SECOND;
                          const newStart = Math.max(0, Math.min(startEnd - MIN_OVERLAY_DURATION, startStart + deltaSec));
                          setOverlayTrim?.(i, 'startSec', newStart);
                        };
                        const onUp = () => {
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                        };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      };
                      const handleOverlayTrimRightMouseDown = (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startStart = overlay.startSec;
                        const startEnd = overlay.endSec;
                        const onMove = (ev: MouseEvent) => {
                          const deltaSec = (ev.clientX - startX) / PIXELS_PER_SECOND;
                          const newEnd = Math.max(startStart + MIN_OVERLAY_DURATION, Math.min(totalDuration, startEnd + deltaSec));
                          setOverlayTrim?.(i, 'endSec', newEnd);
                        };
                        const onUp = () => {
                          document.removeEventListener('mousemove', onMove);
                          document.removeEventListener('mouseup', onUp);
                        };
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                      };
                      return (
                        <div
                          key={overlayId}
                          className="absolute top-0 bottom-0 flex items-stretch overflow-visible"
                          style={{ width, left }}
                        >
                          {isSelected && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-selection text-selection-foreground z-10 whitespace-nowrap">
                              {duration.toFixed(1)}s
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBlock({ type: 'text', id: overlayId });
                              setActiveTool('captions');
                            }}
                            className={`flex-1 rounded-md border-2 flex items-center justify-center px-1.5 min-w-[24px] cursor-pointer transition-colors
                              ${isSelected ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-text-layer/40 bg-text-layer/30 hover:bg-text-layer/40'}
                            `}
                            title={overlay.text}
                          >
                            <Type className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
                          </button>
                          {isSelected && setOverlayTrim && (
                            <>
                              <button
                                type="button"
                                className="absolute left-0 top-0 bottom-0 z-10 w-5 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-r border-primary/50 rounded-l-md"
                                onClick={handleOverlayTrimStartClick}
                                onMouseDown={handleOverlayTrimLeftMouseDown}
                                title="Trim start (drag)"
                              >
                                <div className="w-0.5 h-3 rounded-full bg-primary-foreground/80" />
                              </button>
                              <button
                                type="button"
                                className="absolute right-0 top-0 bottom-0 z-10 w-5 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-l border-primary/50 rounded-r-md"
                                onClick={handleOverlayTrimEndClick}
                                onMouseDown={handleOverlayTrimRightMouseDown}
                                title="Trim end (drag)"
                              >
                                <div className="w-0.5 h-3 rounded-full bg-primary-foreground/80" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Track 2: Adjust filter color */}
              <div className="flex items-center border-b border-border/30" style={{ height: TRACK_HEIGHT }}>
                <div className="w-12 flex-shrink-0 pl-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'adjust' });
                      setActiveTool('adjust');
                    }}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                    title="Adjust color & filters"
                    aria-label="Adjust color & filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="flex-1 flex items-stretch py-1 pr-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'adjust' });
                      setActiveTool('adjust');
                    }}
                    className={`flex-1 rounded-md border-2 flex items-center justify-center min-w-[60px] cursor-pointer transition-colors
                      ${selectedBlock?.type === 'adjust' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-border/50 bg-muted/20 hover:bg-muted/30'}
                    `}
                    style={{ width: Math.max(120, totalDuration * PIXELS_PER_SECOND - 8) }}
                    title="Adjust color & filters"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Track 3: Music */}
              <div className="flex items-center border-b border-border/30" style={{ height: TRACK_HEIGHT }}>
                <div className="w-12 flex-shrink-0 pl-1 flex items-center justify-center">
                  {onEdlChange ? (
                    <button
                      type="button"
                      onClick={() => onEdlChange({ audio: { ...edl.audio, musicTrackMuted: !edl.audio.musicTrackMuted } })}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      title={edl.audio.musicTrackMuted ? 'Unmute music track' : 'Mute music track'}
                      aria-label={edl.audio.musicTrackMuted ? 'Unmute music track' : 'Mute music track'}
                    >
                      {edl.audio.musicTrackMuted ? (
                        <VolumeX className="h-4 w-4" aria-hidden />
                      ) : (
                        <Volume2 className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  ) : (
                    <Music className="h-4 w-4 text-muted-foreground/80" aria-hidden />
                  )}
                </div>
                <div className="flex-1 flex items-stretch py-1 pr-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'music' });
                    }}
                    className={`flex-1 rounded-md border-2 flex items-center justify-center min-w-[60px] cursor-pointer transition-colors relative
                      ${selectedBlock?.type === 'music' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-audio-waveform/20 bg-audio-waveform/10 hover:bg-audio-waveform/20'}
                    `}
                    style={{ width: Math.max(120, totalDuration * PIXELS_PER_SECOND - 8) }}
                    title="Background music"
                  >
                    <Music className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  </button>
                </div>
              </div>

              {/* Track 4: Voice over */}
              <div className="flex items-center border-b border-border/30" style={{ height: TRACK_HEIGHT }}>
                <div className="w-12 flex-shrink-0 pl-1 flex items-center justify-center">
                  {onEdlChange && (
                    <button
                      type="button"
                      onClick={() => onEdlChange({ audio: { ...edl.audio, audioTrackMuted: !edl.audio.audioTrackMuted } })}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      title={edl.audio.audioTrackMuted ? 'Unmute voice over' : 'Mute voice over'}
                      aria-label={edl.audio.audioTrackMuted ? 'Unmute voice over' : 'Mute voice over'}
                    >
                      {edl.audio.audioTrackMuted ? (
                        <VolumeX className="h-4 w-4" aria-hidden />
                      ) : (
                        <Volume2 className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 flex items-stretch py-1 pr-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'audio' });
                    }}
                    className={`flex-1 rounded-md border-2 flex items-center overflow-hidden min-w-[60px] cursor-pointer transition-colors relative
                      ${selectedBlock?.type === 'audio' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-audio-waveform/20 bg-audio-waveform/10 hover:bg-audio-waveform/20'}
                    `}
                    style={{ width: Math.max(120, totalDuration * PIXELS_PER_SECOND - 8) }}
                    title="Voice over"
                  >
                    {audioPeaks && audioPeaks.length > 0 ? (
                      <AudioWaveformCanvas
                        peaks={audioPeaks}
                        widthPx={widthForPeaks}
                        heightPx={WAVEFORM_TRACK_INNER_HEIGHT}
                        className="flex-1 min-w-0 shrink-0"
                      />
                    ) : (
                      <AudioWaveformStripPlaceholder widthPx={widthForPeaks} />
                    )}
                  </button>
                  {selectedBlock?.type === 'audio' && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-selection text-selection-foreground z-10 whitespace-nowrap">
                      {totalDuration.toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>

              {/* Track 5: Video */}
              <div className="flex items-center" style={{ height: TRACK_HEIGHT }}>
                <div className="w-12 flex-shrink-0 pl-1 flex items-center justify-center">
                  {onEdlChange && (
                    <button
                      type="button"
                      onClick={() => onEdlChange({ audio: { ...edl.audio, videoTrackMuted: !edl.audio.videoTrackMuted } })}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
                      title={edl.audio.videoTrackMuted ? 'Unmute video track' : 'Mute video track'}
                      aria-label={edl.audio.videoTrackMuted ? 'Unmute video track' : 'Mute video track'}
                    >
                      {edl.audio.videoTrackMuted ? (
                        <VolumeX className="h-4 w-4" aria-hidden />
                      ) : (
                        <Volume2 className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 flex items-stretch gap-0.5 py-1 pr-2 relative">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    onDragStart={({ active }) => {
                      const i = edl.timeline.findIndex((c, idx) => `clip-${c.id ?? idx}` === active.id);
                      if (i !== -1) setDraggingIndex(i);
                    }}
                  >
                    <SortableContext items={videoClipIds} strategy={horizontalListSortingStrategy}>
                      <div className="flex gap-0.5 items-stretch" style={{ minWidth: 'max-content' }}>
                        <AnimatePresence mode="popLayout">
                          {edl.timeline.map((clip, i) => {
                            const clipId = clip.id ?? `clip-${i}`;
                            const isSelected = selectedBlock?.type === 'video' && selectedBlock.id === clipId;
                            return (
                              <SortableVideoClip
                                key={clipId}
                                clip={clip}
                                index={i}
                                totalDuration={totalDuration}
                                isSelected={isSelected}
                                onSelect={() => {
                                  setSelectedBlock({ type: 'video', id: clipId });
                                  setActiveTool('trim');
                                  onSelectClip(i);
                                }}
                                setClipTrim={setClipTrim}
                                playableUrl={resolvedClipUrls[i] ?? null}
                              />
                            );
                          })}
                        </AnimatePresence>
                        <button
                          type="button"
                          className="flex-shrink-0 rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex items-center justify-center w-10 h-[calc(100%-4px)] min-w-[40px] transition-colors"
                          title="Add clip (coming soon)"
                        >
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            </div>
          </div>
        </div>
        {totalDuration > 0 && (
          <div
            ref={playheadElRef}
            className="absolute top-0 w-0.5 bg-playhead z-10 pointer-events-none"
            style={{
              left: TRACK_LABEL_WIDTH_PX - scrollLeft,
              willChange: 'transform',
              height: RULER_HEIGHT + 5 * TRACK_HEIGHT + 24,
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-playhead rounded-full shadow-[0_0_10px_rgba(255,255,255,0.35)]" />
          </div>
        )}
      </div>
    </div>
  );
}
