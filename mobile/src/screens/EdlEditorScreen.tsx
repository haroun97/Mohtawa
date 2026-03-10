import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  SlidersHorizontal,
  Type,
  Volume2,
  MoveHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  MessageCircle,
  Link,
  Mic,
  Filter,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { UPLOAD_ABORTED_MESSAGE } from '../lib/api';
import { projectsApi, rendersApi, storageApi, mediaApi } from '../lib/api/endpoints';
import { colors } from '../theme/colors';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { usePlayableVideoUrl } from '../lib/playableUrl';
import {
  type EDL,
  type EdlTimelineClip,
  type EdlTextOverlay,
  ensureEdlIds,
  getClipAtPlayhead,
  parseS3Key,
  resolutionToOutput,
  HISTORY_MAX,
  splitTimelineAtPlayhead,
  type ExportResolution,
  type ExportFps,
} from '../lib/edlLib';
import { EdlDraftPlayer } from '../components/edl/EdlDraftPlayer';
import { ExportModal, type ExportOptions } from '../components/edl/ExportModal';
import { AddMediaLoadingModal } from '../components/edl/AddMediaLoadingModal';
import { EdlTimelineTracks, type TrackVisibility, type TrackId } from '../components/edl/EdlTimelineTracks';
import { EditorBottomToolbar, type EditorToolDef } from '../components/edl/EditorBottomToolbar';
import { TrimSheet } from '../components/edl/TrimSheet';
import { AdjustSheet } from '../components/edl/AdjustSheet';
import { AudioSheet } from '../components/edl/AudioSheet';
import { CaptionsSheet } from '../components/edl/CaptionsSheet';
import { SlipSheet } from '../components/edl/SlipSheet';

const POLL_INTERVAL_MS = 2500;
type RenderStatus = 'rendering' | 'done' | 'failed';

type Route = RouteProp<RootStackParamList, 'EdlEditor'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'EdlEditor'>;

const SNAP_GRID_SEC = 0.5;
function snapPlayheadToGrid(sec: number, maxSec: number): number {
  const n = Math.round(sec / SNAP_GRID_SEC) * SNAP_GRID_SEC;
  return Math.max(0, Math.min(maxSec, Math.round(n * 10) / 10));
}

/** Web-style time display: one decimal (e.g. 0:00.0 / 0:05.4). */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const secInt = Math.floor(s);
  const tenth = Math.floor((s - secInt) * 10);
  return `${m}:${secInt.toString().padStart(2, '0')}.${tenth}`;
}

export function EdlEditorScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId } = route.params;

  const [edl, setEdl] = useState<EDL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState<EDL[]>([]);
  const [future, setFuture] = useState<EDL[]>([]);

  const [resolvedClipUrls, setResolvedClipUrls] = useState<(string | null)[]>([]);
  /** Per-clip thumbnail URI; undefined = still loading, null = failed/no url, string = ready */
  const [resolvedThumbnailUrls, setResolvedThumbnailUrls] = useState<(string | null | undefined)[]>([]);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  /** Draft/render video URL (fallback when no clip at playhead). */
  const [draftVideoUrl, setDraftVideoUrl] = useState<string | null>(null);
  /** Color-preview URL when Adjust sheet is open; takes precedence over clip/draft. */
  const [colorPreviewUrl, setColorPreviewUrl] = useState<string | null>(null);
  /** Backend-generated timeline preview URL (cached); null when not ready or invalidated. */
  const [timelinePreviewUrl, setTimelinePreviewUrl] = useState<string | null>(null);
  const [timelinePreviewLoading, setTimelinePreviewLoading] = useState(false);
  const [previewInvalidated, setPreviewInvalidated] = useState(true);

  const [playheadSec, setPlayheadSec] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const seekToRef = useRef<number | null>(null);
  const seekBarWidthRef = useRef(200);

  /** Content duration from EDL; playhead must not exceed this. */
  const maxTimelineSec = edl
    ? edl.timeline.reduce((a, c) => a + Math.max(0.04, c.outSec - c.inSec), 0)
    : 0;

  /** Clip at playhead (for playhead-based preview). */
  const clipAtPlayhead = edl?.timeline?.length && playheadSec >= 0
    ? getClipAtPlayhead(edl.timeline, playheadSec)
    : null;
  const clipPlayUrl = clipAtPlayhead != null && resolvedClipUrls[clipAtPlayhead.index]
    ? resolvedClipUrls[clipAtPlayhead.index]
    : null;
  /** URL passed to the preview player: timeline preview > color preview > clip at playhead > draft. */
  const effectivePlayUrl = timelinePreviewUrl ?? colorPreviewUrl ?? clipPlayUrl ?? draftVideoUrl;

  /** Next clip URL for preloading (reduces pause when switching to the next clip). */
  const nextClipUrl =
    clipAtPlayhead != null &&
    edl?.timeline &&
    clipAtPlayhead.index + 1 < edl.timeline.length &&
    resolvedClipUrls[clipAtPlayhead.index + 1]
      ? resolvedClipUrls[clipAtPlayhead.index + 1]
      : null;

  useEffect(() => {
    if (maxTimelineSec > 0 && playheadSec > maxTimelineSec) {
      setPlayheadSec(maxTimelineSec);
      seekToRef.current = maxTimelineSec;
    }
  }, [maxTimelineSec, playheadSec]);

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<RenderStatus | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState<number | null>(null);
  const [selectedMusic, setSelectedMusic] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(false);
  const [selectedColor, setSelectedColor] = useState(false);
  const [activeTool, setActiveTool] = useState<'adjust' | 'audio' | 'captions' | 'trim' | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [trackVisibility, setTrackVisibility] = useState<TrackVisibility>({
    text: true,
    adjust: true,
    music: true,
    voice: true,
    video: true,
  });
  const [slipMode, setSlipMode] = useState(false);
  const [slipClipId, setSlipClipId] = useState<string | null>(null);
  const [slipOriginalInSec, setSlipOriginalInSec] = useState<number | null>(null);
  const [addClipLoading, setAddClipLoading] = useState(false);
  const [addClipProgress, setAddClipProgress] = useState<number | undefined>(undefined);
  const addClipAbortRef = useRef<(() => void) | null>(null);
  const addClipSimulatedProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playUrl: previewPlayUrl } = usePlayableVideoUrl(
    renderStatus === 'done' && outputVideoUrl ? outputVideoUrl : null
  );

  const loadEdl = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPast([]);
    setFuture([]);
    try {
      const data = await projectsApi.getEdl(projectId);
      const typed = data as unknown as EDL;
      setEdl(ensureEdlIds(typed));
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadEdl();
  }, [loadEdl]);

  // Resolve timeline clip URLs (S3 → presigned)
  useEffect(() => {
    if (!edl?.timeline?.length) {
      setResolvedClipUrls([]);
      return;
    }
    let cancelled = false;
    const resolve = async (clipUrl: string): Promise<string | null> => {
      if (clipUrl.startsWith('http')) return clipUrl;
      // Support both s3://bucket/key and bare storage keys (e.g. from add-clip upload)
      const key = parseS3Key(clipUrl) ?? clipUrl.trim();
      if (!key) return null;
      try {
        const res = await storageApi.playUrl(key);
        return res.url;
      } catch {
        return null;
      }
    };
    Promise.all(edl.timeline.map((c) => resolve(c.clipUrl)))
      .then((urls) => {
        if (!cancelled) setResolvedClipUrls(urls);
      })
      .catch(() => {
        if (!cancelled) setResolvedClipUrls(edl.timeline.map(() => null));
      });
    return () => {
      cancelled = true;
    };
  }, [edl?.timeline]);

  // Generate thumbnails for timeline clip blocks (first frame); update incrementally per clip
  useEffect(() => {
    if (!edl?.timeline?.length || !resolvedClipUrls.length) {
      setResolvedThumbnailUrls([]);
      return;
    }
    const L = resolvedClipUrls.length;
    const prev = resolvedThumbnailUrls;

    setResolvedThumbnailUrls((p) => {
      if (p.length >= L) return p;
      const next = p.slice(0, L);
      while (next.length < L) next.push(undefined);
      return next;
    });

    let cancelled = false;
    for (let i = 0; i < L; i++) {
      const url = resolvedClipUrls[i];
      if (!url) continue;
      if (i < prev.length && typeof prev[i] === 'string') continue;
      (async () => {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(url, { time: 0 });
          if (cancelled) return;
          setResolvedThumbnailUrls((p) => {
            const n = p.slice(0, Math.max(p.length, L));
            while (n.length < L) n.push(undefined);
            n[i] = uri;
            return n;
          });
        } catch {
          if (cancelled) return;
          setResolvedThumbnailUrls((p) => {
            const n = p.slice(0, Math.max(p.length, L));
            while (n.length < L) n.push(undefined);
            n[i] = null;
            return n;
          });
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [edl?.timeline?.length, resolvedClipUrls]);

  // Resolve voiceover URL
  useEffect(() => {
    const raw = edl?.audio?.voiceoverUrl;
    if (!raw?.trim()) {
      setResolvedAudioUrl(null);
      return;
    }
    if (raw.startsWith('http')) {
      setResolvedAudioUrl(raw);
      return;
    }
    const key = parseS3Key(raw);
    if (!key) {
      setResolvedAudioUrl(null);
      return;
    }
    let cancelled = false;
    storageApi
      .playUrl(key)
      .then((res) => {
        if (!cancelled) setResolvedAudioUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setResolvedAudioUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [edl?.audio?.voiceoverUrl]);

  // Initial draft video URL from project
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    projectsApi
      .get(projectId)
      .then((project) => {
        const draftUrl = project.draftVideoUrl ?? null;
        if (cancelled || !draftUrl) return;
        if (draftUrl.startsWith('http')) {
          setDraftVideoUrl(draftUrl);
          return;
        }
        const key = parseS3Key(draftUrl) ?? draftUrl.trim();
        if (!key) {
          setDraftVideoUrl(null);
          return;
        }
        return storageApi.playUrl(key).then((res) => {
          if (!cancelled) setDraftVideoUrl(res.url);
        });
      })
      .catch(() => {
        if (!cancelled) setDraftVideoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Timeline preview: one URL for smooth playback (CapCut-like). Request when we have EDL; refetch when invalidated (e.g. after save).
  const TIMELINE_PREVIEW_TIMEOUT_MS = 90_000; // 90s so backend has time to render; prevents loading from hanging forever
  useEffect(() => {
    if (!projectId || !edl?.timeline?.length || timelinePreviewLoading) return;
    if (!previewInvalidated && timelinePreviewUrl) return;
    setTimelinePreviewLoading(true);
    setPreviewInvalidated(false);
    let cancelled = false;
    const startMs = Date.now();
    console.log('[Timeline preview] Starting request…', { projectId, clipCount: edl?.timeline?.length });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeline preview timeout')), TIMELINE_PREVIEW_TIMEOUT_MS);
    });
    const requestPromise = projectsApi
      .getTimelinePreview(projectId, edl as unknown as Record<string, unknown>)
      .then((res) => {
        if (cancelled) return;
        const url = res.previewUrl;
        if (url.startsWith('http')) {
          setTimelinePreviewUrl(url);
          const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log('[Timeline preview] Ready (direct URL)', { elapsedSec: `${elapsedSec}s` });
          return;
        }
        const key = parseS3Key(url) ?? url.trim();
        if (!key) return;
        return storageApi.playUrl(key).then((r) => {
          if (!cancelled) setTimelinePreviewUrl(r.url);
          const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log('[Timeline preview] Ready (after playUrl)', { elapsedSec: `${elapsedSec}s` });
        });
      });
    Promise.race([requestPromise, timeoutPromise])
      .catch((err) => {
        const elapsedSec = ((Date.now() - startMs) / 1000).toFixed(1);
        console.log('[Timeline preview] Failed or timeout', { elapsedSec: `${elapsedSec}s`, error: err?.message ?? String(err) });
        if (!cancelled) setTimelinePreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setTimelinePreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, previewInvalidated, !!edl?.timeline?.length, timelinePreviewLoading, timelinePreviewUrl]);

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
  }, [edl, past]);

  const handleRedo = useCallback(() => {
    if (future.length === 0 || !edl) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => (p.length >= HISTORY_MAX ? p.slice(1) : p).concat([edl]));
    setEdl(next);
    setDirty(true);
  }, [edl, future]);

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
      setSelectedClipIndex(toIndex);
    },
    [edl, updateEdl]
  );

  const setClipTrimInOut = useCallback(
    (index: number, inSec: number, outSec: number) => {
      if (!edl) return;
      let inVal = inSec;
      let outVal = outSec;
      if (outVal <= inVal) outVal = inVal + 0.04;
      if (inVal >= outVal) inVal = outVal - 0.04;
      const timeline = edl.timeline.map((c, i) =>
        i !== index ? c : { ...c, inSec: inVal, outSec: outVal }
      );
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

  const setClipSlipInAbsolute = useCallback(
    (index: number, newInSec: number) => {
      if (!edl || index < 0 || index >= edl.timeline.length) return;
      const clip = edl.timeline[index];
      const duration = Math.max(0.04, clip.outSec - clip.inSec);
      const sourceDurationSec = clip.sourceDurationSec ?? clip.outSec + 300;
      const maxInSec = Math.max(0, sourceDurationSec - duration);
      const inSec = Math.max(0, Math.min(maxInSec, newInSec));
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
        return { ...c, startSec, outSec: c.inSec + duration };
      });
      updateEdl({ timeline: withStart });
      setSelectedClipIndex(Math.min(index, withStart.length - 1));
    },
    [edl, updateEdl]
  );

  const duplicateClip = useCallback(
    (index: number) => {
      if (!edl || index < 0 || index >= edl.timeline.length) return;
      const clip = edl.timeline[index];
      const clone: EdlTimelineClip = { ...clip, id: `clip-${Date.now()}-${index}` };
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
      setSelectedClipIndex(index + 1);
    },
    [edl, updateEdl]
  );

  const splitClipAtPlayhead = useCallback(
    (clipIndex: number) => {
      if (!edl) return;
      const withStart = splitTimelineAtPlayhead(edl.timeline, clipIndex, playheadSec);
      if (!withStart) return;
      updateEdl({ timeline: withStart });
      setSelectedClipIndex(clipIndex + 1);
    },
    [edl, updateEdl, playheadSec]
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

  const MIN_RANGE_DURATION = 0.1;

  const setMusicTrim = useCallback(
    (field: 'musicStartSec' | 'musicEndSec', value: number) => {
      if (!edl) return;
      const totalDuration = edl.timeline.reduce(
        (a, c) => a + Math.max(0.04, c.outSec - c.inSec),
        0
      );
      let start = field === 'musicStartSec' ? value : (edl.audio.musicStartSec ?? 0);
      let end = field === 'musicEndSec' ? value : (edl.audio.musicEndSec ?? totalDuration);
      if (end <= start) end = start + MIN_RANGE_DURATION;
      if (start >= end) start = end - MIN_RANGE_DURATION;
      start = Math.max(0, Math.min(totalDuration - MIN_RANGE_DURATION, start));
      end = Math.max(MIN_RANGE_DURATION, Math.min(totalDuration, end));
      updateEdl({
        audio: { ...edl.audio, musicStartSec: start, musicEndSec: end },
      });
    },
    [edl, updateEdl]
  );

  const setVoiceTrim = useCallback(
    (field: 'voiceStartSec' | 'voiceEndSec', value: number) => {
      if (!edl) return;
      const totalDuration = edl.timeline.reduce(
        (a, c) => a + Math.max(0.04, c.outSec - c.inSec),
        0
      );
      let start = field === 'voiceStartSec' ? value : (edl.audio.voiceStartSec ?? 0);
      let end = field === 'voiceEndSec' ? value : (edl.audio.voiceEndSec ?? totalDuration);
      if (end <= start) end = start + MIN_RANGE_DURATION;
      if (start >= end) start = end - MIN_RANGE_DURATION;
      start = Math.max(0, Math.min(totalDuration - MIN_RANGE_DURATION, start));
      end = Math.max(MIN_RANGE_DURATION, Math.min(totalDuration, end));
      updateEdl({
        audio: { ...edl.audio, voiceStartSec: start, voiceEndSec: end },
      });
    },
    [edl, updateEdl]
  );

  const setColorTrim = useCallback(
    (field: 'startSec' | 'endSec', value: number) => {
      if (!edl) return;
      const totalDuration = edl.timeline.reduce(
        (a, c) => a + Math.max(0.04, c.outSec - c.inSec),
        0
      );
      const color = edl.color ?? { saturation: 1, contrast: 1, vibrance: 1 };
      let start = field === 'startSec' ? value : (color.startSec ?? 0);
      let end = field === 'endSec' ? value : (color.endSec ?? totalDuration);
      if (end <= start) end = start + MIN_RANGE_DURATION;
      if (start >= end) start = end - MIN_RANGE_DURATION;
      start = Math.max(0, Math.min(totalDuration - MIN_RANGE_DURATION, start));
      end = Math.max(MIN_RANGE_DURATION, Math.min(totalDuration, end));
      updateEdl({
        color: { ...color, startSec: start, endSec: end },
      });
    },
    [edl, updateEdl]
  );

  const deleteOverlay = useCallback(
    (overlayIndex: number) => {
      if (!edl || overlayIndex < 0 || overlayIndex >= edl.overlays.length) return;
      const overlays = edl.overlays.filter((_, i) => i !== overlayIndex) as EdlTextOverlay[];
      updateEdl({ overlays });
      if (selectedOverlayIndex === overlayIndex) setSelectedOverlayIndex(null);
    },
    [edl, updateEdl, selectedOverlayIndex]
  );

  const canSplitAtPlayhead =
    selectedClipIndex != null &&
    edl != null &&
    (() => {
      const clip = edl.timeline[selectedClipIndex];
      if (!clip) return false;
      const segStart = clip.startSec;
      const segEnd = segStart + Math.max(0.04, clip.outSec - clip.inSec);
      return playheadSec > segStart && playheadSec < segEnd;
    })();

  const clearAddClipState = useCallback(() => {
    if (addClipSimulatedProgressRef.current) {
      clearInterval(addClipSimulatedProgressRef.current);
      addClipSimulatedProgressRef.current = null;
    }
    addClipAbortRef.current = null;
    setAddClipProgress(undefined);
    setAddClipLoading(false);
  }, []);

  const handleCancelAddClip = useCallback(() => {
    addClipAbortRef.current?.();
    clearAddClipState();
  }, [clearAddClipState]);

  const handleAddClip = useCallback(async () => {
    if (!edl || addClipLoading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your media library to add a video clip.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const durationSec = asset.duration != null ? asset.duration / 1000 : 10;
    setAddClipLoading(true);
    setAddClipProgress(0);

    let totalBytes: number | undefined;
    if (typeof (asset as { fileSize?: number }).fileSize === 'number') {
      totalBytes = (asset as { fileSize: number }).fileSize;
    }
    if (totalBytes == null) {
      try {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true } as FileSystem.InfoOptions);
        if (info.exists && 'size' in info && typeof info.size === 'number') totalBytes = info.size;
      } catch {
        // ignore
      }
    }

    const SIMULATED_MAX = 85;
    const simulatedId = setInterval(() => {
      setAddClipProgress((prev) => {
        const p = prev ?? 0;
        if (p >= SIMULATED_MAX) return p;
        return Math.min(SIMULATED_MAX, p + 3);
      });
    }, 400);
    addClipSimulatedProgressRef.current = simulatedId;

    const { promise, abort } = mediaApi.uploadWithProgress(
      {
        uri: asset.uri,
        name: asset.fileName ?? 'video.mp4',
        type: asset.mimeType ?? 'video/mp4',
      },
      {
        totalBytes,
        onProgress: (percent) =>
          setAddClipProgress((prev) => Math.max(prev ?? 0, percent)),
      }
    );
    addClipAbortRef.current = abort;

    try {
      const res = await promise;
      if (addClipSimulatedProgressRef.current) {
        clearInterval(addClipSimulatedProgressRef.current);
        addClipSimulatedProgressRef.current = null;
      }
      setAddClipProgress(100);
      const totalDuration = edl.timeline.reduce(
        (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
        0
      );
      const newClip: EdlTimelineClip = {
        id: `clip-${Date.now()}`,
        clipUrl: res.key,
        inSec: 0,
        outSec: Math.max(0.04, durationSec),
        startSec: totalDuration,
        sourceDurationSec: durationSec,
      };
      const timeline = [...edl.timeline, newClip];
      updateEdl({ timeline });
      setSelectedClipIndex(timeline.length - 1);
      setSelectedOverlayIndex(null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== UPLOAD_ABORTED_MESSAGE) {
        Alert.alert('Add clip failed', msg);
      }
    } finally {
      clearAddClipState();
    }
  }, [edl, addClipLoading, updateEdl, clearAddClipState]);

  const editorTools: EditorToolDef[] = (() => {
    const icon = (Node: React.ComponentType<{ size?: number; color?: string }>, active: boolean, disabled: boolean) =>
      React.createElement(Node, {
        size: 20,
        color: disabled ? colors.textSecondary : active ? colors.primary : colors.text,
      });

    if (selectedClipIndex != null && edl) {
      const clipCount = edl.timeline.length;
      return [
        {
          key: 'move-left',
          label: 'Move left',
          icon: icon(ChevronLeft, false, selectedClipIndex <= 0),
          onPress: () => reorderClips(selectedClipIndex, selectedClipIndex - 1),
          disabled: selectedClipIndex <= 0,
        },
        {
          key: 'move-right',
          label: 'Move right',
          icon: icon(ChevronRight, false, selectedClipIndex >= clipCount - 1),
          onPress: () => reorderClips(selectedClipIndex, selectedClipIndex + 1),
          disabled: selectedClipIndex >= clipCount - 1,
        },
        ...(canSplitAtPlayhead
          ? [{
              key: 'split',
              label: 'Split',
              icon: icon(Scissors, false, false),
              onPress: () => splitClipAtPlayhead(selectedClipIndex),
            }]
          : []),
        {
          key: 'trim',
          label: 'Trim',
          icon: icon(Scissors, activeTool === 'trim', false),
          onPress: () => setActiveTool(activeTool === 'trim' ? null : 'trim'),
          active: activeTool === 'trim',
        },
        {
          key: 'duplicate',
          label: 'Duplicate',
          icon: icon(Copy, false, false),
          onPress: () => duplicateClip(selectedClipIndex),
        },
        {
          key: 'delete-clip',
          label: 'Delete',
          icon: icon(Trash2, false, clipCount <= 1),
          onPress: () => deleteClip(selectedClipIndex),
          disabled: clipCount <= 1,
        },
        {
          key: 'slip',
          label: 'Slip',
          icon: icon(MoveHorizontal, false, false),
          onPress: () => {
            const clip = edl.timeline[selectedClipIndex];
            if (clip?.id) {
              setSlipMode(true);
              setSlipClipId(clip.id);
              setSlipOriginalInSec(clip.inSec);
            }
          },
        },
      ];
    }

    if (selectedOverlayIndex != null) {
      return [
        {
          key: 'edit-overlay',
          label: 'Edit',
          icon: icon(Type, activeTool === 'captions', false),
          onPress: () => setActiveTool(activeTool === 'captions' ? null : 'captions'),
          active: activeTool === 'captions',
        },
        {
          key: 'delete-overlay',
          label: 'Delete',
          icon: icon(Trash2, false, false),
          onPress: () => deleteOverlay(selectedOverlayIndex),
        },
      ];
    }

    const trimDisabled = selectedClipIndex == null;
    return [
      { key: 'audio', label: 'Audio', icon: icon(Volume2, activeTool === 'audio', false), onPress: () => setActiveTool(activeTool === 'audio' ? null : 'audio'), active: activeTool === 'audio' },
      { key: 'text', label: 'Text', icon: icon(Type, activeTool === 'captions', false), onPress: () => setActiveTool(activeTool === 'captions' ? null : 'captions'), active: activeTool === 'captions' },
      { key: 'voice', label: 'Voice', icon: icon(Mic, activeTool === 'audio', false), onPress: () => setActiveTool(activeTool === 'audio' ? null : 'audio'), active: activeTool === 'audio' },
      { key: 'links', label: 'Links', icon: icon(Link, false, true), onPress: () => Alert.alert('Links', 'Link overlay support coming soon.'), disabled: true },
      { key: 'captions', label: 'Captions', icon: icon(Type, activeTool === 'captions', false), onPress: () => setActiveTool(activeTool === 'captions' ? null : 'captions'), active: activeTool === 'captions' },
      { key: 'filters', label: 'Filters', icon: icon(Filter, activeTool === 'adjust', false), onPress: () => setActiveTool(activeTool === 'adjust' ? null : 'adjust'), active: activeTool === 'adjust' },
      { key: 'adjust', label: 'Adjust', icon: icon(SlidersHorizontal, activeTool === 'adjust', false), onPress: () => setActiveTool(activeTool === 'adjust' ? null : 'adjust'), active: activeTool === 'adjust' },
      { key: 'trim', label: 'Trim', icon: icon(Scissors, activeTool === 'trim', trimDisabled), onPress: () => selectedClipIndex != null && setActiveTool(activeTool === 'trim' ? null : 'trim'), active: activeTool === 'trim', disabled: trimDisabled },
    ];
  })();

  const handleSave = useCallback(async () => {
    if (!edl || saving) return;
    setSaving(true);
    try {
      await projectsApi.updateEdl(projectId, edl as unknown as Record<string, unknown>);
      setDirty(false);
      setPreviewInvalidated(true);
      setTimelinePreviewUrl(null);
      Alert.alert('Saved', 'EDL saved successfully.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [edl, saving, projectId]);

  const startRender = useCallback(
    (options?: ExportOptions) => {
      if (!edl) return;
      let edlToSave = edl;
      if (options) {
        const { width, height } = resolutionToOutput(options.resolution);
        edlToSave = {
          ...edl,
          output: { ...edl.output, width, height, fps: options.fps },
        };
        updateEdl({ output: edlToSave.output });
      }
      setExporting(true);
      setRenderError(null);
      setOutputVideoUrl(null);
      setRenderProgress(0);
      projectsApi
        .updateEdl(projectId, edlToSave as unknown as Record<string, unknown>)
        .then(() => projectsApi.renderDraft(projectId))
        .then((res) => {
          if (res.jobId) {
            setActiveJobId(res.jobId);
            setRenderStatus('rendering');
          } else if (res.draftVideoUrl) {
            setRenderStatus('done');
            setRenderProgress(100);
            setOutputVideoUrl(res.draftVideoUrl);
            setDraftVideoUrl(res.draftVideoUrl.startsWith('http') ? res.draftVideoUrl : null);
          }
        })
        .catch((e) => {
          setRenderStatus('failed');
          setRenderError((e as Error).message);
        })
        .finally(() => setExporting(false));
    },
    [edl, projectId, updateEdl]
  );
  const handleExportModalConfirm = useCallback(
    (options: ExportOptions) => {
      setExportModalVisible(false);
      startRender(options);
    },
    [startRender]
  );
  const handleRenderDraft = useCallback(() => {
    startRender();
  }, [startRender]);

  // When render completes, resolve output URL for draft player if S3
  useEffect(() => {
    if (renderStatus !== 'done' || !outputVideoUrl) return;
    if (outputVideoUrl.startsWith('http')) {
      setDraftVideoUrl(outputVideoUrl);
      return;
    }
    const key = parseS3Key(outputVideoUrl) ?? outputVideoUrl.trim();
    if (!key) return;
    let cancelled = false;
    storageApi.playUrl(key).then((res) => {
      if (!cancelled) setDraftVideoUrl(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [renderStatus, outputVideoUrl]);

  useEffect(() => {
    if (!activeJobId || renderStatus !== 'rendering') return;
    let cancelled = false;
    const poll = () => {
      rendersApi
        .getStatus(activeJobId!)
        .then((data) => {
          if (cancelled) return;
          setRenderProgress(data.progress ?? 0);
          setRenderStatus(data.status);
          if (data.status === 'done' && data.outputVideoUrl) {
            setOutputVideoUrl(data.outputVideoUrl);
          }
          if (data.status === 'failed') setRenderError('Render failed');
        })
        .catch((e) => {
          if (!cancelled) {
            setRenderStatus('failed');
            setRenderError((e as Error).message);
          }
        });
    };
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeJobId, renderStatus]);

  // When Adjust sheet closes, clear color preview so player falls back to clip/draft.
  useEffect(() => {
    if (activeTool !== 'adjust') setColorPreviewUrl(null);
  }, [activeTool]);

  // Debounced "preview with color": when Adjust sheet is open and color changes, request a short segment with current color and set preview URL.
  const adjustSheetOpenRef = useRef(false);
  useEffect(() => {
    const isAdjust = activeTool === 'adjust';
    adjustSheetOpenRef.current = isAdjust;
    if (!isAdjust || !projectId || !edl?.color || !edl.timeline?.length) return;
    const t = setTimeout(() => {
      projectsApi
        .previewWithColor(projectId, {
          saturation: edl.color!.saturation,
          contrast: edl.color!.contrast,
          vibrance: edl.color!.vibrance,
        })
        .then((res) => {
          if (!adjustSheetOpenRef.current) return;
          const url = res.previewUrl;
          if (url.startsWith('http')) {
            setColorPreviewUrl(url);
            return;
          }
          const key = parseS3Key(url) ?? url.trim();
          if (!key) return;
          return storageApi.playUrl(key).then((r) => {
            if (adjustSheetOpenRef.current) setColorPreviewUrl(r.url);
          });
        })
        .catch(() => {});
    }, 1500);
    return () => {
      adjustSheetOpenRef.current = false;
      clearTimeout(t);
    };
  }, [activeTool, projectId, edl?.color?.saturation, edl?.color?.contrast, edl?.color?.vibrance, edl?.timeline?.length]);

  const dismissRenderProgress = useCallback(() => {
    setActiveJobId(null);
    setRenderStatus(null);
    setRenderProgress(0);
    setOutputVideoUrl(null);
    setRenderError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (dirty) {
      Alert.alert(
        'Unsaved changes',
        'Save before closing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => nav.goBack() },
          { text: 'Save', onPress: () => handleSave().then(() => nav.goBack()) },
        ]
      );
    } else {
      nav.goBack();
    }
  }, [dirty, nav, handleSave]);

  const resolutionLabel =
    (edl?.output?.height ?? 0) >= 2160 ? '4K' : (edl?.output?.height ?? 0) >= 1440 ? '2K' : 'HD';

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const toolbarHeight = 64;
  const contentBottomPadding = toolbarHeight + insets.bottom;
  const headerApprox = 56 + 12 + 44;
  const playbackAndTimelineHeight = 8 + 52 + 8 + 220 + 6;
  const previewMaxHeight = Math.max(
    200,
    windowHeight - headerApprox - contentBottomPadding - playbackAndTimelineHeight - 8
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading EDL…</Text>
      </View>
    );
  }

  if (error && !edl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{projectName ?? 'Edit draft'}</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const showExportOverlay = renderStatus !== null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {projectName ?? 'Edit draft'}
        </Text>
        {/* §18.10.9: Resolution + Export in top toolbar (e.g. 4K  Export) */}
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>{resolutionLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleSave}
          disabled={saving || !edl || !dirty}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Save color={dirty ? colors.primary : colors.textSecondary} size={22} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.exportHeaderBtn}
          onPress={() => setExportModalVisible(true)}
          disabled={!edl || exporting}
        >
          <Download color={edl && !exporting ? colors.text : colors.textSecondary} size={20} />
          <Text style={[styles.exportHeaderBtnText, (!edl || exporting) && styles.exportHeaderBtnTextDisabled]}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleUndo}
          disabled={past.length === 0}
        >
          <Undo2 color={past.length > 0 ? colors.text : colors.textSecondary} size={22} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleRedo}
          disabled={future.length === 0}
        >
          <Redo2 color={future.length > 0 ? colors.text : colors.textSecondary} size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={[styles.bodyContent, { paddingBottom: contentBottomPadding, paddingTop: 8 }]}>
          {/* §18.10.1: Video preview — flex so it uses remaining space; maxHeight so it fits on one screen */}
          <View style={[styles.previewWrap, { maxHeight: previewMaxHeight }]}>
            <EdlDraftPlayer
              playUrl={effectivePlayUrl}
              preloadUrl={timelinePreviewUrl == null && effectivePlayUrl === clipPlayUrl ? nextClipUrl : null}
              playing={playing}
              onPlayingChange={setPlaying}
              onTimeUpdate={(currentTime) => {
                const timelineSec =
                  clipAtPlayhead != null && effectivePlayUrl === clipPlayUrl
                    ? clipAtPlayhead.clip.startSec + currentTime
                    : currentTime;
                const maxSec = maxTimelineSec > 0 ? maxTimelineSec : videoDuration;
                const clamped = maxSec > 0 ? Math.max(0, Math.min(maxSec, timelineSec)) : timelineSec;
                setPlayheadSec(clamped);
              }}
              onDurationChange={setVideoDuration}
              seekToRef={seekToRef}
            />
            {timelinePreviewLoading && !timelinePreviewUrl ? (
              <View style={styles.preparingPreviewOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.preparingPreviewText}>Preparing preview…</Text>
              </View>
            ) : null}
          </View>

          {/* §18.10.2: Playback controls — playhead clamped to content end (maxTimelineSec) */}
          <View style={styles.playbackRow}>
          <TouchableOpacity
            style={styles.playPauseBtn}
            onPress={() => setPlaying((p) => !p)}
            disabled={!effectivePlayUrl}
          >
            {playing ? (
              <Pause color={colors.text} size={24} />
            ) : (
              <Play color={colors.text} size={24} />
            )}
          </TouchableOpacity>
          <Text style={styles.timeText}>
            {formatTime(playheadSec)} / {formatTime(maxTimelineSec > 0 ? maxTimelineSec : videoDuration)}
          </Text>
          <View
            style={styles.seekWrap}
            onLayout={(e) => {
              seekBarWidthRef.current = e.nativeEvent.layout.width || 200;
            }}
          >
            <View style={styles.seekTrack}>
              <View
                style={[
                  styles.seekFill,
                  {
                    width: (() => {
                      const maxSec = maxTimelineSec > 0 ? maxTimelineSec : videoDuration;
                      return maxSec > 0 ? `${(playheadSec / maxSec) * 100}%` : '0%';
                    })(),
                  },
                ]}
              />
            </View>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={(e) => {
                const maxSec = maxTimelineSec > 0 ? maxTimelineSec : videoDuration;
                if (maxSec <= 0) return;
                const { locationX } = e.nativeEvent;
                const w = seekBarWidthRef.current;
                const frac = Math.max(0, Math.min(1, locationX / w));
                const sec = Math.max(0, Math.min(maxSec, frac * maxSec));
                setPlayheadSec(sec);
                seekToRef.current = sec;
              }}
            />
          </View>
          <TouchableOpacity
            style={styles.playbackIconBtn}
            onPress={handleUndo}
            disabled={past.length === 0}
          >
            <Undo2 size={20} color={past.length > 0 ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playbackIconBtn}
            onPress={handleRedo}
            disabled={future.length === 0}
          >
            <Redo2 size={20} color={future.length > 0 ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
          </View>

          {/* Timeline fills remaining space — no page scroll */}
          {edl && (
            <View style={styles.timelineWrap}>
              <EdlTimelineTracks
            edl={edl}
            playheadSec={playheadSec}
            resolvedClipUrls={resolvedClipUrls}
            resolvedThumbnailUrls={resolvedThumbnailUrls}
            resolvedAudioUrl={resolvedAudioUrl}
            selectedClipIndex={selectedClipIndex}
            selectedOverlayIndex={selectedOverlayIndex}
            onSelectClip={(i) => {
              setSelectedClipIndex(i);
              setSelectedOverlayIndex(null);
              setSelectedMusic(false);
              setSelectedVoice(false);
              setSelectedColor(false);
            }}
            onSelectOverlay={(i) => {
              setSelectedOverlayIndex(i);
              setSelectedClipIndex(null);
              setSelectedMusic(false);
              setSelectedVoice(false);
              setSelectedColor(false);
            }}
            onSelectMusic={() => {
              setSelectedMusic(true);
              setSelectedVoice(false);
              setSelectedColor(false);
              setSelectedClipIndex(null);
              setSelectedOverlayIndex(null);
            }}
            onSelectVoice={() => {
              setSelectedVoice(true);
              setSelectedMusic(false);
              setSelectedColor(false);
              setSelectedClipIndex(null);
              setSelectedOverlayIndex(null);
            }}
            onSelectColor={() => {
              setSelectedColor(true);
              setSelectedMusic(false);
              setSelectedVoice(false);
              setSelectedClipIndex(null);
              setSelectedOverlayIndex(null);
            }}
            onAdjustPress={() => setActiveTool('adjust')}
            onMusicTrim={setMusicTrim}
            onVoiceTrim={setVoiceTrim}
            onColorTrim={setColorTrim}
            onClipTrim={(index, field, value) => {
              if (!edl) return;
              const c = edl.timeline[index];
              if (!c) return;
              if (field === 'inSec') setClipTrimInOut(index, value, c.outSec);
              else setClipTrimInOut(index, c.inSec, value);
            }}
            onOverlayTrim={(overlayIndex: number, field: 'startSec' | 'endSec', value: number) => {
              setOverlayTrim(overlayIndex, field, value);
            }}
            onSeek={(sec) => {
              const maxSec = edl.timeline.reduce((a, c) => a + Math.max(0.04, c.outSec - c.inSec), 0);
              const snapped = snapPlayheadToGrid(sec, maxSec);
              setPlayheadSec(snapped);
              const at = getClipAtPlayhead(edl.timeline, snapped);
              seekToRef.current = at != null ? at.inClipTime : snapped;
            }}
            trackVisibility={trackVisibility}
            onTrackVisibilityChange={(track: TrackId, visible: boolean) => {
              setTrackVisibility((prev: TrackVisibility) => ({ ...prev, [track]: visible }));
            }}
            onAddClip={handleAddClip}
            onReorderClips={reorderClips}
            selectedMusic={selectedMusic}
            selectedVoice={selectedVoice}
            selectedColor={selectedColor}
              />
            </View>
          )}
        </View>
        {/* Option B: Full-height strip so reserved area reads as toolbar, not gap */}
        <View
          style={[
            styles.toolbarAnchor,
            {
              height: contentBottomPadding,
              backgroundColor: colors.surface,
              justifyContent: 'flex-end',
            },
          ]}
        >
          <EditorBottomToolbar tools={editorTools} />
        </View>
      </View>

      <TrimSheet
        visible={activeTool === 'trim' && selectedClipIndex != null}
        onClose={() => setActiveTool(null)}
        edl={edl}
        selectedClipIndex={selectedClipIndex}
        onTrimApply={(index, inSec, outSec) => {
          setClipTrimInOut(index, inSec, outSec);
          setActiveTool(null);
        }}
      />
      <AdjustSheet
        visible={activeTool === 'adjust'}
        onClose={() => setActiveTool(null)}
        edl={edl}
        onEdlChange={updateEdl}
      />
      <AudioSheet
        visible={activeTool === 'audio'}
        onClose={() => setActiveTool(null)}
        edl={edl}
        onEdlChange={updateEdl}
      />
      <CaptionsSheet
        visible={activeTool === 'captions'}
        onClose={() => setActiveTool(null)}
        edl={edl}
        onEdlChange={updateEdl}
        onDeleteOverlay={deleteOverlay}
      />
      {edl && slipMode && slipClipId != null && (() => {
        const slipClipIndex = edl.timeline.findIndex((c) => c.id === slipClipId);
        const slipClip = slipClipIndex >= 0 ? edl.timeline[slipClipIndex] : null;
        return (
          <SlipSheet
            visible
            clip={slipClip}
            clipIndex={slipClipIndex >= 0 ? slipClipIndex : 0}
            originalInSec={slipOriginalInSec ?? slipClip?.inSec ?? 0}
            onConfirm={(newInSec) => {
              if (slipClipIndex >= 0) setClipSlipInAbsolute(slipClipIndex, newInSec);
              setSlipMode(false);
              setSlipClipId(null);
              setSlipOriginalInSec(null);
            }}
            onCancel={() => {
              if (slipClipIndex >= 0 && slipOriginalInSec != null) setClipSlipInAbsolute(slipClipIndex, slipOriginalInSec);
              setSlipMode(false);
              setSlipClipId(null);
              setSlipOriginalInSec(null);
            }}
          />
        );
      })()}

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExportModalConfirm}
        initialResolution={(edl?.output?.height ?? 0) >= 2160 ? '4K' : (edl?.output?.height ?? 0) >= 1440 ? '2K' : 'HD'}
        initialFps={(edl?.output?.fps as ExportFps) ?? 30}
        exporting={exporting}
      />

      <AddMediaLoadingModal
        visible={addClipLoading}
        statusText="Loading media"
        progress={addClipProgress}
        onCancel={handleCancelAddClip}
      />

      {showExportOverlay && (
        <Modal visible transparent animationType="fade">
          <View style={styles.exportOverlay}>
            <View style={styles.exportCard}>
              <Text style={styles.progressTitle}>
                {renderStatus === 'rendering' && 'Rendering…'}
                {renderStatus === 'done' && 'Render complete'}
                {renderStatus === 'failed' && 'Render failed'}
              </Text>
              {renderStatus === 'rendering' && (
                <>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[styles.progressBarFill, { width: `${Math.round(renderProgress)}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPct}>{Math.round(renderProgress)}%</Text>
                </>
              )}
              {renderStatus === 'failed' && renderError && (
                <Text style={styles.renderErrorText}>{renderError}</Text>
              )}
              {renderStatus === 'done' && (
                <TouchableOpacity
                  style={styles.previewVideoBtn}
                  onPress={() => setPreviewModalVisible(true)}
                >
                  <Text style={styles.previewVideoBtnText}>Preview video</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.dismissProgressBtn} onPress={dismissRenderProgress}>
                <Text style={styles.dismissProgressBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <VideoPreviewModal
        visible={previewModalVisible}
        videoUrl={previewPlayUrl}
        title="Draft preview"
        onClose={() => setPreviewModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, flex: 1 },
  headerBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  iconBtn: { padding: 8 },
  exportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  exportHeaderBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  exportHeaderBtnTextDisabled: { color: colors.textSecondary },
  body: { flex: 1 },
  bodyContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  toolbarAnchor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  /** §18.10.1: 9:16 preview — flex to use remaining space; maxHeight set inline from window height */
  previewWrap: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    minHeight: 120,
    aspectRatio: 9 / 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  preparingPreviewOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  preparingPreviewText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  timelineSection: {
    minHeight: 200,
    marginBottom: 12,
  },
  timelineSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  /** §18.10.19: Timeline full height so all 5 tracks visible (ruler + 5×36 + 8 = 212) */
  timelineWrap: {
    minHeight: 220,
    marginBottom: 6,
  },
  /** §18.10.2: [Play] time progress [Undo] [Redo] */
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  playPauseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 96 },
  seekWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    maxWidth: 220,
  },
  seekTrack: {
    height: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 5,
    overflow: 'hidden',
  },
  seekFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  playbackIconBtn: { padding: 8 },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: 12 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  errorText: { fontSize: 16, color: colors.error, textAlign: 'center' },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  exportCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressPct: { fontSize: 14, color: colors.textSecondary },
  renderErrorText: { fontSize: 14, color: colors.error, marginBottom: 12 },
  previewVideoBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  previewVideoBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  dismissProgressBtn: { paddingVertical: 10, alignItems: 'center' },
  dismissProgressBtnText: { fontSize: 15, color: colors.textSecondary },
});
