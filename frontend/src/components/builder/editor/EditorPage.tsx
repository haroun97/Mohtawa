import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { LivePreviewPlayer } from './LivePreviewPlayer';
import { TimelineTracks } from './TimelineTracks';
import { PlaybackControls } from './PlaybackControls';
import { BottomToolbar } from './BottomToolbar';
import { ClipToolbar } from './ClipToolbar';
import { ContextualActionBar } from './ContextualActionBar';
import { SlipModeOverlay } from './SlipModeOverlay';
import { EditorTopBar } from './EditorTopBar';
import { ToolSheet } from './ToolSheet';
import { AdjustSheet, AdjustSheetContent } from './AdjustSheet';
import { AudioControlSheet } from './AudioControlSheet';
import { CaptionsSheet, CaptionsSheetContent } from './CaptionsSheet';
import { TrimSheetContent } from './TrimSheet';
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
  /** Resolved playable URL for voiceover (S3 → presigned). Used for waveform. */
  resolvedAudioUrl?: string | null;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
  onClose: () => void | Promise<void>;
  onExport: (options?: import('./ExportModal').ExportOptions) => void;
  onSaveDraft?: () => void | Promise<void>;
  dirty?: boolean;
  savingDraft?: boolean;
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
  resolvedAudioUrl = null,
  onEdlChange,
  onClose,
  onExport,
  onSaveDraft,
  dirty = false,
  savingDraft = false,
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
  const [playing, setPlaying] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const playheadSecRef = useRef(0);
  const lastPlayheadUpdateRef = useRef(0);
  const throttledSetPlayheadSec = useCallback((sec: number) => {
    const now = performance.now();
    if (now - lastPlayheadUpdateRef.current >= 100) {
      lastPlayheadUpdateRef.current = now;
      setPlayheadSec(sec);
    }
  }, []);

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
  const setSlipMode = edlEditorStore((s) => s.setSlipMode);
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
  }, [projectId]);

  const handleReorder = useCallback(
    (from: number, to: number) => {
      reorderClips(from, to);
      const clip = edl.timeline[to];
      if (clip) setSelectedBlock({ type: 'video', id: clip.id ?? `clip-${to}` });
    },
    [reorderClips, edl.timeline, setSelectedBlock]
  );

  const handleTimelineSeek = useCallback((sec: number) => {
    playheadSecRef.current = sec;
    setPlayheadSec(sec);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setPlaying(playing);
    if (!playing) setPlayheadSec(playheadSecRef.current);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef?.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, [videoRef]);

  const handleToolSelect = useCallback(
    (id: string | null) => {
      const supported: Array<'adjust' | 'audio' | 'captions' | 'trim'> = [
        'adjust',
        'audio',
        'captions',
        'trim',
      ];
      const next =
        id && supported.includes(id as 'adjust' | 'audio' | 'captions' | 'trim')
          ? (id as 'adjust' | 'audio' | 'captions' | 'trim')
          : null;
      setActiveTool(activeTool === next ? null : next);
      setSelectedBlock(null);
    },
    [activeTool, setActiveTool, setSelectedBlock]
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

  const showToolSheet =
    !isMobile &&
    (activeTool === 'adjust' ||
      activeTool === 'captions' ||
      (activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length));

  const toolSheetTitle =
    activeTool === 'adjust'
      ? 'Adjust'
      : activeTool === 'captions'
          ? 'Captions'
          : activeTool === 'trim'
            ? `Trim — Clip ${(selectedClipIndex ?? 0) + 1}`
            : '';

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col bg-editor-bg-immersive min-h-[100dvh] overflow-hidden select-none"
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
        onSaveDraft={onSaveDraft}
        dirty={dirty}
        savingDraft={savingDraft}
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
        <main className="flex-1 min-h-0 flex flex-col min-w-0 flex-1">
          <section className="relative flex flex-1 min-h-0 items-center justify-center px-4 py-4 bg-editor-bg-immersive">
            <div
              className="relative w-full max-w-[240px] md:max-w-[280px] h-full max-h-full rounded-2xl overflow-hidden bg-editor-preview shadow-2xl shadow-black/40"
              style={{ aspectRatio: '9/16' }}
            >
                <LivePreviewPlayer
                  timeline={edl.timeline}
                  resolvedClipUrls={resolvedClipUrls}
                  playheadSec={playheadSec}
                  onTimeUpdate={throttledSetPlayheadSec}
                  onDurationChange={setVideoDuration}
                  onPlayingChange={handlePlayingChange}
                  edlColor={edl.color}
                  overlays={edl.overlays}
                  selectedOverlayId={
                    selectedBlock?.type === 'text' ? selectedBlock.id : null
                  }
                  onSelectOverlay={(id) =>
                    setSelectedBlock({ type: 'text', id })
                  }
                  videoRef={videoRef}
                  className="absolute inset-0 w-full h-full"
                  voiceoverUrl={resolvedAudioUrl ?? null}
                  videoTrackMuted={edl.audio?.videoTrackMuted ?? false}
                  audioTrackMuted={edl.audio?.audioTrackMuted ?? false}
                  voiceVolume={edl.audio?.voiceVolume ?? 1}
                  playheadSecRef={playheadSecRef}
                />
              </div>
            </section>
            <PlaybackControls
              isPlaying={playing}
              currentTime={playheadSec}
              duration={totalDuration}
              onTogglePlay={handleTogglePlay}
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          <section className="flex-shrink-0 flex flex-col gap-0 px-2 pb-2 md:px-4 md:pb-4">
            <div className="rounded-xl overflow-hidden border border-border/30 bg-editor-timeline/80 shadow-lg shadow-black/20">
              <TimelineTracks
                edl={edl}
                playheadSec={playheadSec}
                playheadSecRef={playheadSecRef}
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
                trimActive={activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length}
                audioUrl={resolvedAudioUrl ?? edl.audio?.voiceoverUrl ?? null}
                onEdlChange={onEdlChange}
              />
            </div>
          </section>
        </main>

        <ToolSheet
          isOpen={showToolSheet}
          onClose={() => setActiveTool(null)}
          title={toolSheetTitle}
        >
          {activeTool === 'adjust' && <AdjustSheetContent edl={edl} onEdlChange={onEdlChange} />}
          {activeTool === 'captions' && <CaptionsSheetContent edl={edl} onEdlChange={onEdlChange} />}
          {activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length && !isMobile && (
            <TrimSheetContent edl={edl} onEdlChange={onEdlChange} selectedClipIndex={selectedClipIndex} />
          )}
        </ToolSheet>

        {isMobile && activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length && (
          <div className="flex-shrink-0 border-t border-border/30 bg-editor-surface/95 px-4 py-3 overflow-y-auto max-h-[40vh]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-foreground">Trim — Clip {selectedClipIndex + 1}</h3>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Done
              </button>
            </div>
            <TrimSheetContent edl={edl} onEdlChange={onEdlChange} selectedClipIndex={selectedClipIndex} />
          </div>
        )}

        {selectedClipIndex != null ? (
          <ClipToolbar
            clipType="video"
            onSlip={() => {
              const clip = edl.timeline[selectedClipIndex];
              if (clip?.id) setSlipMode(true, clip.id);
            }}
            onEdit={() => setActiveTool('trim')}
            onVolume={() => setActiveTool('audio')}
            onSplit={
              onSplitClipAtPlayhead && canSplitAtPlayhead
                ? () => onSplitClipAtPlayhead(selectedClipIndex, playheadSec)
                : undefined
            }
            canSplit={canSplitAtPlayhead}
            onDelete={
              onDeleteClip && edl.timeline.length > 1
                ? () => onDeleteClip(selectedClipIndex)
                : undefined
            }
            canDelete={edl.timeline.length > 1}
            onDuplicate={onDuplicateClip ? () => onDuplicateClip(selectedClipIndex) : undefined}
            onCopy={onDuplicateClip ? () => onDuplicateClip(selectedClipIndex) : undefined}
          />
        ) : selectedOverlayIndexResolved != null ? (
          <ContextualActionBar
            onEdit={undefined}
            onDeleteClip={undefined}
            canDeleteClip={false}
            onDeleteOverlay={
              onDeleteOverlay ? () => onDeleteOverlay(selectedOverlayIndexResolved) : undefined
            }
            canDeleteOverlay
            onDuplicateClip={undefined}
            onSplitClipAtPlayhead={undefined}
            canSplitAtPlayhead={false}
            onEnterSlip={undefined}
            onExitSlip={undefined}
          />
        ) : (
          <BottomToolbar
            activeToolId={activeTool ?? null}
            onToolSelect={handleToolSelect}
            trimDisabled={selectedClipIndex == null}
          />
        )}
      </div>

      <AudioControlSheet
        open={activeTool === 'audio'}
        onClose={() => setActiveTool(null)}
        edl={edl}
        onEdlChange={onEdlChange}
        initialTab={
          selectedClipIndex != null
            ? 'original'
            : selectedBlock?.type === 'music'
              ? 'music'
              : selectedBlock?.type === 'audio'
                ? 'voiceover'
                : 'original'
        }
      />
      {isMobile && (
        <>
          <AdjustSheet edl={edl} onEdlChange={onEdlChange} />
          <CaptionsSheet edl={edl} onEdlChange={onEdlChange} />
        </>
      )}
    </motion.div>
  );
}
