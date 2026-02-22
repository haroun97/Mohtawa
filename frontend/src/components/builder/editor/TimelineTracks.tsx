import React, { useRef, useEffect, useCallback, useState } from 'react';
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
import { GripVertical, Film, Type, Music, Sliders, Plus } from 'lucide-react';
import type { EDL, EdlTimelineClip, EdlTextOverlay } from '@/lib/api';
import { edlEditorStore } from '@/store/edlEditorStore';
import { VideoThumbnailStrip } from './VideoThumbnailStrip';

const PIXELS_PER_SECOND = 80;
const TRACK_HEIGHT = 40;
const RULER_HEIGHT = 28;
const TRACK_LABEL_WIDTH_PX = 64; // w-16, matches track row labels so time axis aligns

interface TimelineTracksProps {
  edl: EDL;
  playheadSec: number;
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

  const handleTrimLeft = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const step = 0.1;
      const newIn = Math.min(clip.inSec + step, clip.outSec - 0.04);
      setClipTrim(index, 'inSec', newIn);
    },
    [clip.inSec, clip.outSec, index, setClipTrim]
  );
  const handleTrimRight = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const step = 0.1;
      const newOut = Math.max(clip.outSec - step, clip.inSec + 0.04);
      setClipTrim(index, 'outSec', newOut);
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
        flex shrink-0 items-stretch rounded-md border-2 transition-colors relative overflow-hidden
        min-w-[40px] touch-pan-x
        ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/40' : 'border-border bg-card hover:bg-card/90'}
        ${isDragging ? 'opacity-60 z-50' : ''}
      `}
      onClick={() => onSelect()}
    >
      {isSelected && (
        <>
          <button
            type="button"
            className="absolute left-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-r border-primary/50"
            onClick={handleTrimLeft}
            onMouseDown={(e) => e.stopPropagation()}
            title="Trim start"
          >
            <div className="w-1 h-4 rounded-full bg-primary-foreground/80" />
          </button>
          <button
            type="button"
            className="absolute right-0 top-0 bottom-0 z-10 w-6 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-l border-primary/50"
            onClick={handleTrimRight}
            onMouseDown={(e) => e.stopPropagation()}
            title="Trim end"
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
}: TimelineTracksProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
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

  return (
    <div className="flex flex-col gap-0 rounded-lg border border-border bg-muted/20 overflow-hidden min-w-0">
      <div className="relative flex-1 min-h-0 min-w-0">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden touch-pan-x min-w-0 [-webkit-overflow-scrolling:touch]"
          style={{ height: RULER_HEIGHT + 4 * TRACK_HEIGHT + 24 }}
          onClick={handleTrackContentClick}
          onScroll={() => setScrollLeft(scrollRef.current?.scrollLeft ?? 0)}
        >
          <div className="relative flex flex-col" style={{ width: contentWidth, minWidth: contentWidth }}>
            <div
              className="flex-shrink-0 border-b border-border bg-muted/40 px-2 text-xs text-muted-foreground flex items-stretch"
              style={{ height: RULER_HEIGHT, minHeight: RULER_HEIGHT }}
            >
              <div className="w-16 flex-shrink-0" aria-hidden />
              <div className="flex h-full items-end gap-0">
                {ticks.map((t) => (
                  <div
                    key={t}
                    className="flex-shrink-0 flex flex-col items-center"
                    style={{ width: PIXELS_PER_SECOND }}
                  >
                    <span className="text-[10px] font-medium">{t}s</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex flex-col flex-1" style={{ minHeight: 4 * TRACK_HEIGHT }}>
              {/* Track: Adjust */}
              <div className="flex items-center border-b border-border/50" style={{ height: TRACK_HEIGHT }}>
                <div className="w-16 flex-shrink-0 pl-1 text-[10px] font-medium text-muted-foreground">Adjust</div>
                <div className="flex-1 flex items-stretch py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'adjust' });
                      setActiveTool('adjust');
                    }}
                    className={`rounded-md border-2 flex items-center justify-center px-2 min-w-[60px] cursor-pointer transition-colors
                      ${selectedBlock?.type === 'adjust' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20'}
                    `}
                    style={{ width: Math.max(60, totalDuration * PIXELS_PER_SECOND - 8) }}
                    title="Color"
                  >
                    <Sliders className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Track: Text */}
              <div className="flex items-center border-b border-border/50 relative" style={{ height: TRACK_HEIGHT }}>
                <div className="w-16 flex-shrink-0 pl-1 text-[10px] font-medium text-muted-foreground">Text</div>
                <div className="flex-1 relative py-1 pr-2" style={{ minHeight: TRACK_HEIGHT - 8 }}>
                  {edl.overlays.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBlock({ type: 'text', id: '' });
                        setActiveTool('captions');
                      }}
                      className={`rounded-md border-2 flex items-center justify-center gap-1.5 px-2 min-w-[100px] cursor-pointer transition-colors text-[10px]
                        ${selectedBlock?.type === 'text' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20'}
                      `}
                      style={{ width: Math.max(120, totalDuration * PIXELS_PER_SECOND - 8) }}
                      title="Add text overlays / captions"
                    >
                      <Type className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="text-muted-foreground/90">Add captions</span>
                    </button>
                  ) : (
                    edl.overlays.map((o, i) => {
                      const overlay = o as EdlTextOverlay;
                      const overlayId = overlay.id ?? `overlay-${i}`;
                      const duration = Math.max(0.1, overlay.endSec - overlay.startSec);
                      const width = Math.max(24, duration * PIXELS_PER_SECOND);
                      const left = overlay.startSec * PIXELS_PER_SECOND;
                      const isSelected = selectedBlock?.type === 'text' && selectedBlock.id === overlayId;
                      const handleOverlayTrimStart = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const step = 0.1;
                        const newStart = Math.min(overlay.startSec + step, overlay.endSec - 0.1);
                        setOverlayTrim?.(i, 'startSec', newStart);
                      };
                      const handleOverlayTrimEnd = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        const step = 0.1;
                        const newEnd = Math.max(overlay.endSec - step, overlay.startSec + 0.1);
                        setOverlayTrim?.(i, 'endSec', newEnd);
                      };
                      return (
                        <div
                          key={overlayId}
                          className="absolute top-0 bottom-0 flex items-stretch"
                          style={{ width, left }}
                        >
                          <button
                            type="button"
                          onClick={() => {
                            setSelectedBlock({ type: 'text', id: overlayId });
                            setActiveTool('captions');
                          }}
                            className={`flex-1 rounded-md border-2 flex items-center justify-center px-1.5 min-w-[24px] cursor-pointer transition-colors
                              ${isSelected ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20'}
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
                                onClick={handleOverlayTrimStart}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Trim start"
                              >
                                <div className="w-0.5 h-3 rounded-full bg-primary-foreground/80" />
                              </button>
                              <button
                                type="button"
                                className="absolute right-0 top-0 bottom-0 z-10 w-5 flex items-center justify-center bg-primary/30 hover:bg-primary/50 cursor-ew-resize border-l border-primary/50 rounded-r-md"
                                onClick={handleOverlayTrimEnd}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Trim end"
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

              {/* Track: Audio */}
              <div className="flex items-center border-b border-border/50" style={{ height: TRACK_HEIGHT }}>
                <div className="w-16 flex-shrink-0 pl-1 text-[10px] font-medium text-muted-foreground">Audio</div>
                <div className="flex-1 flex items-stretch py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock({ type: 'audio' });
                      setActiveTool('audio');
                    }}
                    className={`rounded-md border-2 flex items-center justify-center px-2 min-w-[60px] cursor-pointer transition-colors
                      ${selectedBlock?.type === 'audio' ? 'border-primary bg-primary/15 ring-1 ring-primary/40' : 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20'}
                    `}
                    style={{ width: Math.max(60, totalDuration * PIXELS_PER_SECOND - 8) }}
                    title="Voice / Music"
                  >
                    <Music className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Track: Video (sortable clips + thumbnails) */}
              <div className="flex items-center" style={{ height: TRACK_HEIGHT }}>
                <div className="w-16 flex-shrink-0 pl-1 text-[10px] font-medium text-muted-foreground">Video</div>
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
            className="absolute top-0 w-0.5 bg-primary z-10 pointer-events-none rounded-full"
            style={{
              left: TRACK_LABEL_WIDTH_PX + playheadSec * PIXELS_PER_SECOND - scrollLeft,
              transform: 'translateX(-50%)',
              height: RULER_HEIGHT + 4 * TRACK_HEIGHT + 24,
            }}
          />
        )}
      </div>
    </div>
  );
}
