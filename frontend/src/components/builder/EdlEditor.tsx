import { useState, useEffect, useCallback, useRef } from 'react';
import { api, projectsApi, rendersApi, type EDL, type EdlTextOverlay } from '@/lib/api';
import { parseS3Key } from '@/components/builder/editor/editorLib';
import { EditorPage } from '@/components/builder/editor/EditorPage';
import { ExportScreen } from '@/components/builder/editor/ExportScreen';
import type {
  ExportOptions,
  ExportResolution,
} from '@/components/builder/editor/ExportModal';
import { edlEditorStore, getSelectedClipId } from '@/store/edlEditorStore';
import type { EdlTimelineClip } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EdlEditorProps {
  projectId: string;
  initialDraftVideoUrl?: string;
  onClose: () => void;
  onSaved?: () => void;
}

/** Map export resolution to 16:9 output dimensions. */
function resolutionToOutput(
  resolution: ExportResolution
): { width: number; height: number } {
  switch (resolution) {
    case '4K':
      return { width: 3840, height: 2160 };
    case '2K':
      return { width: 2560, height: 1440 };
    case 'HD':
    default:
      return { width: 1920, height: 1080 };
  }
}

function ensureEdlIds(data: EDL): EDL {
  return {
    ...data,
    timeline: data.timeline.map((c, i) => ({
      ...c,
      id: c.id ?? `clip-${i}`,
    })),
    overlays: data.overlays.map((o, i) => ({
      ...o,
      id: (o as EdlTextOverlay).id ?? `overlay-${i}`,
    })),
    color: data.color ?? { saturation: 1, contrast: 1, vibrance: 1 },
    audio: {
      ...data.audio,
      musicEnabled: data.audio.musicEnabled ?? false,
      musicVolume: data.audio.musicVolume ?? 0.5,
      voiceVolume: data.audio.voiceVolume ?? 1,
    },
  };
}

export function EdlEditor({
  projectId,
  initialDraftVideoUrl,
  onClose,
  onSaved,
}: EdlEditorProps) {
  const [edl, setEdl] = useState<EDL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<'rendering' | 'done' | 'failed'>('rendering');
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [exportOutputUrl, setExportOutputUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** When starting sync export, we store current draftVideoUrl so we only show "done" when the new render overwrites it. */
  const draftVideoUrlAtExportStartRef = useRef<string | null>(null);
  const setSaveStatus = edlEditorStore((s) => s.setSaveStatus);

  const loadEdl = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPast([]);
    setFuture([]);
    try {
      const data = await projectsApi.getEdl(projectId);
      setEdl(ensureEdlIds(data));
      setDirty(false);
      setSaveStatus('saved');
    } catch (e: unknown) {
      setError(e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load EDL');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadEdl();
  }, [loadEdl]);

  // Simulated progress for sync (in-process) render until backend reports real progress. 0–1 scale.
  useEffect(() => {
    if (exportJobId !== 'sync' || exportStatus !== 'rendering') return;
    const SYNC_PROGRESS_MS = 40000;
    const SYNC_PROGRESS_INTERVAL_MS = 500;
    const interval = setInterval(() => {
      setExportProgress((p) => Math.min(p + (0.9 * SYNC_PROGRESS_INTERVAL_MS) / SYNC_PROGRESS_MS, 0.99));
    }, SYNC_PROGRESS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [exportJobId, exportStatus]);

  // Poll export-preview when sync: live progress + frame thumbnails from in-process render.
  useEffect(() => {
    if (exportJobId !== 'sync' || exportStatus !== 'rendering') return;
    const poll = async () => {
      try {
        const res = await projectsApi.getExportPreview(projectId);
        if (res.previewImageUrl) setExportPreviewUrl(res.previewImageUrl);
        if (res.progress > 0) setExportProgress(res.progress);
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [exportJobId, exportStatus, projectId]);

  // Poll project when sync to detect completion. Only treat "done" when draftVideoUrl changed (new render overwrote it).
  useEffect(() => {
    if (exportJobId !== 'sync' || exportStatus !== 'rendering') return;
    const poll = async () => {
      try {
        const project = await projectsApi.get(projectId);
        const current = project.draftVideoUrl ?? null;
        const atStart = draftVideoUrlAtExportStartRef.current;
        const isNewDraft = current !== atStart && current != null;
        if (isNewDraft) {
          const url = project.draftVideoUrl!.startsWith('http')
            ? project.draftVideoUrl!
            : (await api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(parseS3Key(project.draftVideoUrl!) ?? '')}`)).url;
          setPlayUrl(url);
          setExportStatus('done');
          setExportProgress(1);
          setExportOutputUrl(url);
          setDirty(false);
          setSaveStatus('saved');
          toast.success('Export complete');
          onSaved?.();
        }
      } catch {
        // keep polling
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [exportJobId, exportStatus, projectId, onSaved, setSaveStatus]);

  // Poll render status when we have a jobId (live export preview). Skip when jobId is 'sync' (in-process render).
  useEffect(() => {
    if (!exportJobId || exportJobId === 'sync') return;
    const poll = async () => {
      try {
        const res = await rendersApi.getStatus(exportJobId!);
        setExportStatus(res.status);
        setExportProgress(res.progress);
        setExportPreviewUrl(res.previewImageUrl ?? null);
        if (res.outputVideoUrl) setExportOutputUrl(res.outputVideoUrl);
        if (res.status === 'done') {
          if (res.outputVideoUrl) setPlayUrl(res.outputVideoUrl);
          setExportProgress(1);
          setDirty(false);
          setSaveStatus('saved');
          toast.success('Export complete');
          onSaved?.();
        }
        if (res.status === 'failed') {
          setExportError('Export failed');
        }
      } catch {
        // keep polling on network error
      }
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [exportJobId, onSaved, setSaveStatus]);

  useEffect(() => {
    if (!initialDraftVideoUrl) {
      setPlayUrl(null);
      return;
    }
    if (initialDraftVideoUrl.startsWith('http')) {
      setPlayUrl(initialDraftVideoUrl);
      return;
    }
    const key = parseS3Key(initialDraftVideoUrl);
    if (!key) {
      setPlayUrl(null);
      return;
    }
    let cancelled = false;
    api
      .get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!cancelled) setPlayUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setPlayUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [initialDraftVideoUrl]);

  const HISTORY_MAX = 50;
  const [past, setPast] = useState<EDL[]>([]);
  const [future, setFuture] = useState<EDL[]>([]);

  const updateEdl = useCallback((patch: Partial<EDL> | ((prev: EDL) => EDL)) => {
    setEdl((prev) => {
      if (!prev) return prev;
      setPast((p) => (p.length >= HISTORY_MAX ? p.slice(1) : p).concat([prev]));
      setFuture([]);
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      setDirty(true);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (past.length === 0 || !edl) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [edl, ...f]);
    setEdl(previous);
    setDirty(true);
  }, [edl, past.length]);

  const handleRedo = useCallback(() => {
    if (future.length === 0 || !edl) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => (p.length >= HISTORY_MAX ? p.slice(1) : p).concat([edl]));
    setEdl(next);
    setDirty(true);
  }, [edl, future.length]);

  const reorderClips = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!edl || fromIndex === toIndex) return;
      const timeline = [...edl.timeline];
      const [removed] = timeline.splice(fromIndex, 1);
      timeline.splice(toIndex, 0, removed);
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const duration = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec, outSec: c.inSec + duration };
        startSec += duration;
        return out;
      });
      updateEdl({ timeline: withStart });
    },
    [edl, updateEdl]
  );

  const setClipTrim = useCallback(
    (index: number, field: 'inSec' | 'outSec', value: number) => {
      if (!edl) return;
      const timeline = edl.timeline.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, [field]: value };
        if (field === 'outSec' && next.outSec <= next.inSec) next.outSec = next.inSec + 0.04;
        if (field === 'inSec' && next.inSec >= next.outSec) next.inSec = next.outSec - 0.04;
        return next;
      });
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const duration = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec };
        startSec += duration;
        return out;
      });
      updateEdl({ timeline: withStart });
    },
    [edl, updateEdl]
  );

  const setClipSlip = useCallback(
    (index: number, deltaSec: number) => {
      if (!edl || index < 0 || index >= edl.timeline.length) return;
      const clip = edl.timeline[index];
      const duration = Math.max(0.04, clip.outSec - clip.inSec);
      const newIn = Math.max(0, clip.inSec + deltaSec);
      const newOut = newIn + duration;
      const timeline = edl.timeline.map((c, i) =>
        i !== index ? c : { ...c, inSec: newIn, outSec: newOut }
      );
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const dur = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec };
        startSec += dur;
        return out;
      });
      updateEdl({ timeline: withStart });
    },
    [edl, updateEdl]
  );

  const setClipSlipInAbsolute = useCallback(
    (index: number, newInSec: number) => {
      if (!edl || index < 0 || index >= edl.timeline.length) return;
      const clip = edl.timeline[index];
      const duration = Math.max(0.04, clip.outSec - clip.inSec);
      const inSec = Math.max(0, newInSec);
      const outSec = inSec + duration;
      const timeline = edl.timeline.map((c, i) =>
        i !== index ? c : { ...c, inSec, outSec }
      );
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const dur = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec };
        startSec += dur;
        return out;
      });
      updateEdl({ timeline: withStart });
    },
    [edl, updateEdl]
  );

  const deleteClip = useCallback(
    (index: number) => {
      if (!edl || edl.timeline.length <= 1) return;
      const timeline = edl.timeline.filter((_, i) => i !== index) as EdlTimelineClip[];
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const duration = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec, outSec: c.inSec + duration };
        startSec += duration;
        return out;
      });
      updateEdl({ timeline: withStart });
      const newIndex = Math.min(index, withStart.length - 1);
      const nextClip = withStart[newIndex];
      edlEditorStore.getState().setSelectedBlock(
        nextClip ? { type: 'video', id: nextClip.id ?? `clip-${newIndex}` } : null
      );
    },
    [edl, updateEdl]
  );

  const setOverlayTrim = useCallback(
    (overlayIndex: number, field: 'startSec' | 'endSec', value: number) => {
      if (!edl || overlayIndex < 0 || overlayIndex >= edl.overlays.length) return;
      const overlays = edl.overlays.map((o, i) => {
        if (i !== overlayIndex) return o;
        const next = { ...o, [field]: value } as EdlTextOverlay;
        if (field === 'endSec' && next.endSec <= next.startSec) next.endSec = next.startSec + 0.1;
        if (field === 'startSec' && next.startSec >= next.endSec) next.startSec = next.endSec - 0.1;
        return next;
      });
      updateEdl({ overlays });
    },
    [edl, updateEdl]
  );

  const duplicateClip = useCallback(
    (index: number) => {
      if (!edl || index < 0 || index >= edl.timeline.length) return;
      const clip = edl.timeline[index];
      const clone: EdlTimelineClip = {
        ...clip,
        id: `clip-${Date.now()}-${index}`,
      };
      const timeline = [...edl.timeline];
      timeline.splice(index + 1, 0, clone);
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const duration = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec, outSec: c.inSec + duration };
        startSec += duration;
        return out;
      });
      updateEdl({ timeline: withStart });
      edlEditorStore.getState().setSelectedBlock({ type: 'video', id: clone.id! });
    },
    [edl, updateEdl]
  );

  const splitClipAtPlayhead = useCallback(
    (clipIndex: number, playheadSec: number) => {
      if (!edl || clipIndex < 0 || clipIndex >= edl.timeline.length) return;
      const clip = edl.timeline[clipIndex];
      const segStart = clip.startSec;
      const segEnd = segStart + Math.max(0.04, clip.outSec - clip.inSec);
      if (playheadSec <= segStart || playheadSec >= segEnd) return;
      const duration = clip.outSec - clip.inSec;
      const t = (playheadSec - segStart) / (segEnd - segStart);
      const splitInOut = clip.inSec + t * duration;
      const first: EdlTimelineClip = {
        ...clip,
        id: clip.id ?? `clip-${clipIndex}`,
        outSec: splitInOut,
      };
      const second: EdlTimelineClip = {
        ...clip,
        id: `clip-${Date.now()}-split`,
        inSec: splitInOut,
        outSec: clip.outSec,
      };
      const timeline = [...edl.timeline];
      timeline.splice(clipIndex, 1, first, second);
      let startSec = 0;
      const withStart = timeline.map((c) => {
        const dur = Math.max(0.04, c.outSec - c.inSec);
        const out = { ...c, startSec, outSec: c.inSec + dur };
        startSec += dur;
        return out;
      });
      updateEdl({ timeline: withStart });
      edlEditorStore.getState().setSelectedBlock({ type: 'video', id: second.id! });
    },
    [edl, updateEdl]
  );

  const handleSaveAndRerender = useCallback(
    async (options?: ExportOptions) => {
      if (!edl || saving) return;
      let edlToSave = edl;
      if (options) {
        const { width, height } = resolutionToOutput(options.resolution);
        const newOutput = {
          ...edl.output,
          width,
          height,
          fps: options.fps,
        };
        edlToSave = { ...edl, output: newOutput };
        updateEdl({ output: newOutput });
      }
      setSaving(true);
      setError(null);
      setExportProgress(0);
      setExportError(null);
      setSaveStatus('saving');
      toast.info('Exporting…');
      try {
        await projectsApi.updateEdl(projectId, edlToSave);
        const projectBefore = await projectsApi.get(projectId);
        draftVideoUrlAtExportStartRef.current = projectBefore.draftVideoUrl ?? null;
        setExportJobId('sync');
        setExportStatus('rendering');
        setExportProgress(0);
        setExportPreviewUrl(null);
        setExportOutputUrl(null);
        setExportError(null);
        setSaving(false);
        // Run render in background; modal closes when this promise resolves
        projectsApi
          .renderDraft(projectId)
          .then((result) => {
            if (result.status === 'completed' && result.draftVideoUrl) {
              const draftUrl = result.draftVideoUrl;
              const applyDone = (playableUrl: string) => {
                setPlayUrl(playableUrl);
                setExportStatus('done');
                setExportProgress(1);
                setExportOutputUrl(playableUrl);
                setDirty(false);
                setSaveStatus('saved');
                toast.success('Export complete');
                onSaved?.();
              };
              if (draftUrl.startsWith('http')) {
                applyDone(draftUrl);
              } else {
                const key = parseS3Key(draftUrl);
                key
                  ? api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`).then((r) => applyDone(r.url))
                  : applyDone(draftUrl);
              }
            } else if (result.jobId) {
              setExportJobId(result.jobId);
              setExportStatus('rendering');
              setExportProgress(0);
              setExportPreviewUrl(null);
              setExportOutputUrl(null);
              setExportError(null);
            } else {
              const poll = async (): Promise<void> => {
                await new Promise((r) => setTimeout(r, 2000));
                const project = await projectsApi.get(projectId);
                const current = project.draftVideoUrl ?? null;
                const atStart = draftVideoUrlAtExportStartRef.current;
                if (current != null && current !== atStart) {
                  const projectUrl = project.draftVideoUrl!.startsWith('http')
                    ? project.draftVideoUrl!
                    : (await api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(parseS3Key(project.draftVideoUrl!) ?? '')}`)).url;
                  setPlayUrl(projectUrl);
                  setExportStatus('done');
                  setExportProgress(1);
                  setExportOutputUrl(projectUrl);
                  setDirty(false);
                  setSaveStatus('saved');
                  toast.success('Export complete');
                  onSaved?.();
                  return;
                }
                return poll();
              };
              void poll();
            }
          })
          .catch((e: unknown) => {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Export failed';
            setExportStatus('failed');
            setExportError(msg);
            setError(msg);
            setSaveStatus('idle');
            toast.error(msg);
          });
      } catch (e: unknown) {
        setExportProgress(0);
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Export failed';
        setError(msg);
        setSaveStatus('idle');
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [edl, saving, projectId, onSaved, setSaveStatus, updateEdl]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (e.code === 'Space' && v) {
        e.preventDefault();
        if (v.paused) v.play();
        else v.pause();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (edl && !saving) handleSaveAndRerender();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as Node;
        if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
        const selectedClipId = getSelectedClipId(edlEditorStore.getState());
        if (selectedClipId == null || !edl || edl.timeline.length <= 1) return;
        const index = edl.timeline.findIndex((c) => (c.id ?? '') === selectedClipId);
        if (index >= 0) {
          e.preventDefault();
          deleteClip(index);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [edl, saving, handleSaveAndRerender, deleteClip]);

  useEffect(() => {
    return () => {
      edlEditorStore.getState().setActiveTool(null);
      edlEditorStore.getState().setSelectedBlock(null);
      edlEditorStore.getState().setSaveStatus('idle');
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !edl) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (!edl) return null;

  return (
    <>
      {exportJobId != null && (
        <ExportScreen
          status={exportStatus}
          progress={exportProgress}
          previewImageUrl={exportPreviewUrl}
          outputVideoUrl={exportOutputUrl}
          error={exportError}
          onComplete={() => {
            setExportJobId(null);
            setExportError(null);
          }}
        />
      )}
      <EditorPage
      projectId={projectId}
      projectName={undefined}
      edl={edl}
      playUrl={playUrl}
      onEdlChange={updateEdl}
      onClose={onClose}
      onExport={handleSaveAndRerender}
      exportDisabled={false}
      exporting={saving}
      exportProgress={exportProgress}
      error={error}
      canUndo={past.length > 0}
      canRedo={future.length > 0}
      onUndo={handleUndo}
      onRedo={handleRedo}
      reorderClips={reorderClips}
      setClipTrim={setClipTrim}
      setClipSlip={setClipSlip}
      setClipSlipInAbsolute={setClipSlipInAbsolute}
      setOverlayTrim={setOverlayTrim}
      onDeleteClip={deleteClip}
      onDuplicateClip={duplicateClip}
      onSplitClipAtPlayhead={splitClipAtPlayhead}
      videoRef={videoRef}
    />
    </>
  );
}
