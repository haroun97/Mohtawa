import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { PreviewPlayer } from './PreviewPlayer';
import { TimelineTracks } from './TimelineTracks';
import { ContextualActionBar } from './ContextualActionBar';
import { SlipModeOverlay } from './SlipModeOverlay';
import { EditorTopBar } from './EditorTopBar';
import { AdjustSheet, AdjustSheetContent } from './AdjustSheet';
import { AudioSheet, AudioSheetContent } from './AudioSheet';
import { CaptionsSheet, CaptionsSheetContent } from './CaptionsSheet';
import { TrimSheet, TrimSheetContent } from './TrimSheet';
import { edlEditorStore, getSelectedClipId } from '@/store/edlEditorStore';
import type { EDL } from '@/lib/api';
import type { ExportResolution, ExportFps } from './ExportModal';

interface EditorPageProps {
  projectId: string;
  projectName?: string;
  edl: EDL;
  playUrl: string | null;
  /** Resolved playable URLs for timeline clips (index matches edl.timeline). Used for thumbnails. */
  resolvedClipUrls?: (string | null)[];
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
  onClose: () => void;
  onExport: (options?: import('./ExportModal').ExportOptions) => void;
  exportDisabled?: boolean;
  exporting?: boolean;
  exportProgress?: number;
  error?: string | null;
  reorderClips: (fromIndex: number, toIndex: number) => void;
  setClipTrim: (index: number, field: 'inSec' | 'outSec', value: number) => void;
  setClipSlip?: (index: number, deltaSec: number) => void;
  setClipSlipInAbsolute?: (index: number, newInSec: number) => void;
  setOverlayTrim?: (overlayIndex: number, field: 'startSec' | 'endSec', value: number) => void;
  onDeleteClip?: (index: number) => void;
  onDeleteOverlay?: (overlayIndex: number) => void;
  onDuplicateClip?: (index: number) => void;
  onSplitClipAtPlayhead?: (clipIndex: number, playheadSec: number) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function EditorPage({
  projectId,
  projectName,
  edl,
  playUrl,
  resolvedClipUrls = [],
  onEdlChange,
  onClose,
  onExport,
  exportDisabled = false,
  exporting = false,
  exportProgress = 0,
  error,
  reorderClips,
  setClipTrim,
  setClipSlip,
  setClipSlipInAbsolute,
  setOverlayTrim,
  onDeleteClip,
  onDeleteOverlay,
  onDuplicateClip,
  onSplitClipAtPlayhead,
  videoRef,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: EditorPageProps) {
  const isMobile = useIsMobile();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Move focus into the editor when content mounts so mobile treats it as the active layer (fixes unclickable / no scroll until Export tapped).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const selectedBlock = edlEditorStore((s) => s.selectedBlock);
  const setSelectedBlock = edlEditorStore((s) => s.setSelectedBlock);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const slipMode = edlEditorStore((s) => s.slipMode);
  const slipClipId = edlEditorStore((s) => s.slipClipId);
  const slipOriginalInSec = edlEditorStore((s) => s.slipOriginalInSec);
  const setSlipOriginalInSec = edlEditorStore((s) => s.setSlipOriginalInSec);
  const prevSlipActive = useRef(false);
  useEffect(() => {
    const now = slipMode && slipClipId != null;
    if (now && !prevSlipActive.current) {
      const idx = edl.timeline.findIndex((c) => (c.id ?? '') === slipClipId);
      const clip = edl.timeline[idx];
      if (clip != null) setSlipOriginalInSec(clip.inSec);
    }
    if (!now) setSlipOriginalInSec(null);
    prevSlipActive.current = !!now;
  }, [slipMode, slipClipId, edl.timeline, setSlipOriginalInSec]);

  const totalDuration = edl.timeline.reduce(
    (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
    0
  );

  const activeTool = edlEditorStore((s) => s.activeTool);
  const selectedClipId = edlEditorStore(getSelectedClipId);
  const selectedClipIndex =
    selectedClipId == null
      ? null
      : edl.timeline.findIndex((c) => (c.id ?? '') === selectedClipId);

  const selectedOverlayIndex =
    selectedBlock?.type === 'text'
      ? edl.overlays.findIndex((o, i) => (o.id ?? `overlay-${i}`) === selectedBlock.id)
      : null;
  const selectedOverlayIndexResolved = selectedOverlayIndex !== -1 ? selectedOverlayIndex : null;

  const handleSelectClip = useCallback(
    (index: number) => {
      const clip = edl.timeline[index];
      if (clip) setSelectedBlock({ type: 'video', id: clip.id ?? `clip-${index}` });
    },
    [edl.timeline, setSelectedBlock]
  );

  useEffect(() => {
    if (selectedBlock == null && edl.timeline.length > 0) {
      setSelectedBlock({ type: 'video', id: edl.timeline[0].id ?? 'clip-0' });
    }
  }, [edl.timeline, selectedBlock, setSelectedBlock]);

  useEffect(() => {
    setPlayheadSec(0);
    const t = setTimeout(() => {
      if (videoRef?.current) {
        videoRef.current.currentTime = 0;
      }
    }, 0);
    return () => clearTimeout(t);
  }, [playUrl, videoRef]);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      reorderClips(from, to);
      const clip = edl.timeline[to];
      if (clip) setSelectedBlock({ type: 'video', id: clip.id ?? `clip-${to}` });
    },
    [reorderClips, edl.timeline, setSelectedBlock]
  );

  const handleTimelineSeek = useCallback(
    (sec: number) => {
      setPlayheadSec(sec);
      if (videoRef?.current) {
        videoRef.current.currentTime = sec;
      }
    },
    [videoRef]
  );

  const canSplitAtPlayhead =
    selectedClipIndex != null &&
    (() => {
      const clip = edl.timeline[selectedClipIndex];
      if (!clip) return false;
      const segStart = clip.startSec;
      const segEnd = segStart + Math.max(0.04, clip.outSec - clip.inSec);
      return playheadSec > segStart && playheadSec < segEnd;
    })();

  // Keyboard: S = split at playhead (desktop and mobile keyboard)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 's' && e.key !== 'S') return;
      if (e.metaKey || e.ctrlKey) return; // leave Cmd/Ctrl+S for save
      const target = e.target as Node;
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      if (!canSplitAtPlayhead || selectedClipIndex == null || !onSplitClipAtPlayhead) return;
      e.preventDefault();
      onSplitClipAtPlayhead(selectedClipIndex, playheadSec);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSplitAtPlayhead, selectedClipIndex, playheadSec, onSplitClipAtPlayhead]);

  const resolution =
    edl.output && edl.output.width && edl.output.height
      ? `${edl.output.height}p`
      : '1080p';

  const initialExportResolution: ExportResolution =
    edl.output?.height >= 2160 ? '4K' : edl.output?.height >= 1440 ? '2K' : 'HD';
  const initialExportFps: ExportFps =
    edl.output?.fps === 24 || edl.output?.fps === 60 ? edl.output.fps : 30;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col bg-background min-h-[100dvh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {slipMode && slipClipId != null && setClipSlipInAbsolute && (() => {
        const idx = edl.timeline.findIndex((c) => (c.id ?? '') === slipClipId);
        const slipClip = idx >= 0 ? edl.timeline[idx] : null;
        const resolvedUrl = resolvedClipUrls[idx] ?? slipClip?.clipUrl ?? null;
        const originalIn = slipOriginalInSec ?? slipClip?.inSec ?? 0;
        return slipClip != null ? (
          <SlipModeOverlay
            clip={slipClip}
            clipIndex={idx}
            resolvedClipUrl={resolvedUrl}
            setClipSlipInAbsolute={setClipSlipInAbsolute}
            onConfirm={() => edlEditorStore.getState().setSlipMode(false)}
            onCancel={() => {
              setClipSlipInAbsolute(idx, originalIn);
              edlEditorStore.getState().setSlipMode(false);
            }}
          />
        ) : null;
      })()}

      <EditorTopBar
        projectName={projectName}
        resolution={resolution}
        initialExportResolution={initialExportResolution}
        initialExportFps={initialExportFps}
        onClose={onClose}
        onExport={onExport}
        exportDisabled={exportDisabled}
        exporting={exporting}
        exportProgress={exportProgress}
        error={error}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        closeButtonRef={closeButtonRef}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <main className="flex-1 min-h-0 flex flex-col min-w-0 p-3 md:p-4">
            <section className="flex-1 min-h-0 flex items-center justify-center max-h-[50vh] md:max-h-[60vh] px-6 md:px-10">
              <PreviewPlayer
                playUrl={playUrl}
                edlColor={edl.color}
                overlays={edl.overlays}
                playheadSec={playheadSec}
                onTimeUpdate={setPlayheadSec}
                onDurationChange={setVideoDuration}
                videoRef={videoRef}
                className="w-full max-w-[280px] md:max-w-md h-full"
              />
            </section>
            <section className="flex-shrink-0 pt-3 flex flex-col gap-2">
              <TimelineTracks
                edl={edl}
                playheadSec={playheadSec}
                videoDuration={videoDuration}
                resolvedClipUrls={resolvedClipUrls}
                onReorder={handleReorder}
                onSelectClip={handleSelectClip}
                setClipTrim={setClipTrim}
                setOverlayTrim={setOverlayTrim}
                onSeek={handleTimelineSeek}
                dragOverIndex={dragOverIndex}
                draggingIndex={draggingIndex}
                setDragOverIndex={setDragOverIndex}
                setDraggingIndex={setDraggingIndex}
              />
            </section>
          </main>
          {!isMobile && (
            <aside className="hidden md:flex w-72 flex-shrink-0 border-l border-border flex-col overflow-hidden bg-muted/20">
              {activeTool === 'adjust' && (
                <div className="flex flex-col overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold mb-3">Adjust</h3>
                  <AdjustSheetContent edl={edl} onEdlChange={onEdlChange} />
                </div>
              )}
              {activeTool === 'audio' && (
                <div className="flex flex-col overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold mb-3">Audio</h3>
                  <AudioSheetContent edl={edl} onEdlChange={onEdlChange} />
                </div>
              )}
              {activeTool === 'captions' && (
                <div className="flex flex-col overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold mb-3">Captions</h3>
                  <CaptionsSheetContent edl={edl} onEdlChange={onEdlChange} />
                </div>
              )}
              {activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length && (
                <div className="flex flex-col overflow-y-auto p-4">
                  <h3 className="text-sm font-semibold mb-3">Trim — Clip {selectedClipIndex + 1}</h3>
                  <TrimSheetContent edl={edl} onEdlChange={onEdlChange} selectedClipIndex={selectedClipIndex} />
                </div>
              )}
            </aside>
          )}
        </div>

        <ContextualActionBar
          onEdit={undefined}
          onDeleteClip={selectedClipIndex != null ? () => onDeleteClip?.(selectedClipIndex) : undefined}
          canDeleteClip={selectedClipIndex != null && edl.timeline.length > 1}
          onDeleteOverlay={
            selectedOverlayIndexResolved != null && onDeleteOverlay
              ? () => onDeleteOverlay(selectedOverlayIndexResolved)
              : undefined
          }
          canDeleteOverlay={selectedOverlayIndexResolved != null}
          onDuplicateClip={selectedClipIndex != null ? () => onDuplicateClip?.(selectedClipIndex) : undefined}
          onSplitClipAtPlayhead={
            selectedClipIndex != null && onSplitClipAtPlayhead
              ? () => onSplitClipAtPlayhead(selectedClipIndex, playheadSec)
              : undefined
          }
          canSplitAtPlayhead={canSplitAtPlayhead}
          onEnterSlip={undefined}
          onExitSlip={undefined}
        />
      </div>

      {isMobile && (
        <>
          <AdjustSheet edl={edl} onEdlChange={onEdlChange} />
          <AudioSheet edl={edl} onEdlChange={onEdlChange} />
          <CaptionsSheet edl={edl} onEdlChange={onEdlChange} />
          <TrimSheet edl={edl} onEdlChange={onEdlChange} selectedClipIndex={selectedClipIndex ?? null} />
        </>
      )}
    </motion.div>
  );
}
