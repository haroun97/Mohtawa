import { useState, useCallback, useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { PreviewPlayer } from './PreviewPlayer';
import { TimelineTracks } from './TimelineTracks';
import { ContextualActionBar } from './ContextualActionBar';
import { SlipPanel } from './SlipPanel';
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
  onDuplicateClip,
  onSplitClipAtPlayhead,
  videoRef,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: EditorPageProps) {
  const isMobile = useIsMobile();
  const [playheadSec, setPlayheadSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const selectedBlock = edlEditorStore((s) => s.selectedBlock);
  const setSelectedBlock = edlEditorStore((s) => s.setSelectedBlock);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const slipMode = edlEditorStore((s) => s.slipMode);
  const slipClipId = edlEditorStore((s) => s.slipClipId);

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
      className="fixed inset-0 z-[200] flex flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
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
              {slipMode && slipClipId != null && setClipSlipInAbsolute && (() => {
                const idx = edl.timeline.findIndex((c) => (c.id ?? '') === slipClipId);
                const slipClip = idx >= 0 ? edl.timeline[idx] : null;
                return slipClip ? (
                  <SlipPanel
                    clip={slipClip}
                    clipIndex={idx}
                    setClipSlipInAbsolute={setClipSlipInAbsolute}
                  />
                ) : null;
              })()}
              <TimelineTracks
                edl={edl}
                playheadSec={playheadSec}
                videoDuration={videoDuration}
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
