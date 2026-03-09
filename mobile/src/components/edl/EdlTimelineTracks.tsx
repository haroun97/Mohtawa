import React, { useRef, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Film, Type, Music, SlidersHorizontal, Eye, EyeOff, Volume2, VolumeX, Plus } from 'lucide-react-native';
import type { EDL, EdlTimelineClip, EdlTextOverlay } from '../../lib/edlLib';
import { colors } from '../../theme/colors';

const PIXELS_PER_SECOND_DEFAULT = 60;
const MIN_ZOOM_PPS = 30;
const MAX_ZOOM_PPS = 200;
/** 0–1: lower = smoother/slower zoom response. 0.5 = half sensitivity. */
const ZOOM_PINCH_SENSITIVITY = 0.5;
/** 0–1: how much to move toward target each frame. Higher = snappier, lower = smoother. */
const ZOOM_SMOOTHING_FACTOR = 0.35;
const TRACK_HEIGHT = 36;
const RULER_HEIGHT = 24;
/** Reserved width (px) on the left of the voice clip for the "Voice" label so waveform does not cover it. */
const VOICE_LABEL_ZONE_WIDTH = 44;
const MIN_CLIP_DURATION = 0.04;
const SNAP_GRID_SEC = 0.5;
const TRACK_IDS = ['text', 'adjust', 'music', 'voice', 'video'] as const;
/** Min height so ruler + all 5 tracks + inner padding are visible (no bottom clip). */
const TIMELINE_CONTENT_HEIGHT = RULER_HEIGHT + TRACK_IDS.length * TRACK_HEIGHT + 8;
/** Vertical offset for video track row (ruler + 4 tracks above). §18.10.21 Task 2: floating add button. */
const VIDEO_TRACK_TOP = RULER_HEIGHT + (TRACK_IDS.length - 1) * TRACK_HEIGHT;
export type TrackId = (typeof TRACK_IDS)[number];

export type TrackVisibility = Record<TrackId, boolean>;

const DEFAULT_TRACK_VISIBILITY: TrackVisibility = {
  text: true,
  adjust: true,
  music: true,
  voice: true,
  video: true,
};

type Props = {
  edl: EDL;
  playheadSec: number;
  resolvedClipUrls: (string | null)[];
  /** Per-clip thumbnail; undefined = loading, null = failed, string = ready */
  resolvedThumbnailUrls?: (string | null | undefined)[];
  resolvedAudioUrl?: string | null;
  selectedClipIndex: number | null;
  selectedOverlayIndex: number | null;
  trackVisibility?: TrackVisibility;
  onTrackVisibilityChange?: (track: TrackId, visible: boolean) => void;
  onSelectClip: (index: number) => void;
  onSelectOverlay: (index: number) => void;
  onAdjustPress?: () => void;
  onClipTrim?: (index: number, field: 'inSec' | 'outSec', value: number) => void;
  onOverlayTrim?: (overlayIndex: number, field: 'startSec' | 'endSec', value: number) => void;
  onMusicTrim?: (field: 'musicStartSec' | 'musicEndSec', value: number) => void;
  onVoiceTrim?: (field: 'voiceStartSec' | 'voiceEndSec', value: number) => void;
  onColorTrim?: (field: 'startSec' | 'endSec', value: number) => void;
  onSeek?: (sec: number) => void;
  onAddClip?: () => void;
  onReorderClips?: (fromIndex: number, toIndex: number) => void;
  selectedMusic?: boolean;
  selectedVoice?: boolean;
  selectedColor?: boolean;
  onSelectMusic?: () => void;
  onSelectVoice?: () => void;
  onSelectColor?: () => void;
};

function snapToGrid(sec: number, maxSec: number): number {
  const n = Math.round(sec / SNAP_GRID_SEC) * SNAP_GRID_SEC;
  return Math.max(0, Math.min(maxSec, Math.round(n * 10) / 10));
}

export function EdlTimelineTracks({
  edl,
  playheadSec,
  resolvedClipUrls,
  resolvedThumbnailUrls,
  selectedClipIndex,
  selectedOverlayIndex,
  trackVisibility = DEFAULT_TRACK_VISIBILITY,
  onTrackVisibilityChange,
  onSelectClip,
  onSelectOverlay,
  onAdjustPress,
  onClipTrim,
  onOverlayTrim,
  onMusicTrim,
  onVoiceTrim,
  onColorTrim,
  onSeek,
  onAddClip,
  onReorderClips,
  resolvedAudioUrl,
  selectedMusic = false,
  selectedVoice = false,
  selectedColor = false,
  onSelectMusic,
  onSelectVoice,
  onSelectColor,
}: Props) {
  const [pixelsPerSecond, setPixelsPerSecond] = useState(PIXELS_PER_SECOND_DEFAULT);
  const pinchScaleRef = useRef(pixelsPerSecond);

  const totalDuration = edl.timeline.reduce(
    (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
    0
  );
  const widthPx = Math.max(400, totalDuration * pixelsPerSecond);
  const playheadStartRef = useRef(playheadSec);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          pinchScaleRef.current = pixelsPerSecond;
        })
        .onUpdate((e) => {
          const effectiveScale = 1 + (e.scale - 1) * ZOOM_PINCH_SENSITIVITY;
          const target = Math.max(
            MIN_ZOOM_PPS,
            Math.min(MAX_ZOOM_PPS, pinchScaleRef.current * effectiveScale)
          );
          pinchScaleRef.current = target;
          setPixelsPerSecond((prev) => {
            const diff = target - prev;
            if (Math.abs(diff) < 0.5) return target;
            return prev + diff * ZOOM_SMOOTHING_FACTOR;
          });
        })
        .onEnd(() => {
          setPixelsPerSecond(pinchScaleRef.current);
        }),
    [pixelsPerSecond]
  );

  const playheadPan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
          playheadStartRef.current = playheadSec;
        })
        .onUpdate((e) => {
          const sec = playheadStartRef.current + e.translationX / pixelsPerSecond;
          const clamped = Math.max(0, Math.min(totalDuration, sec));
          onSeek?.(snapToGrid(clamped, totalDuration));
        })
        .onEnd((e) => {
          const sec = playheadStartRef.current + e.translationX / pixelsPerSecond;
          const clamped = Math.max(0, Math.min(totalDuration, sec));
          onSeek?.(snapToGrid(clamped, totalDuration));
        }),
    [playheadSec, totalDuration, pixelsPerSecond, onSeek]
  );

  const toggleTrack = (track: TrackId) => {
    const visible = !trackVisibility[track];
    onTrackVisibilityChange?.(track, visible);
  };

  const getDropIndex = (centerSec: number): number => {
    for (let i = 0; i < edl.timeline.length; i++) {
      const c = edl.timeline[i];
      const start = c.startSec;
      const dur = Math.max(MIN_CLIP_DURATION, c.outSec - c.inSec);
      if (centerSec >= start && centerSec < start + dur) return i;
    }
    return -1;
  };

  const handleClipDragEnd = (dragIndex: number, centerSec: number) => {
    const toIndex = getDropIndex(centerSec);
    if (toIndex >= 0 && toIndex !== dragIndex) onReorderClips?.(dragIndex, toIndex);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.scroll}>
        <GestureDetector gesture={pinchGesture}>
          <View style={[styles.inner, { width: widthPx }]}>
            {/* Ruler — tap to seek */}
            <TouchableOpacity
              style={[styles.ruler, { width: widthPx }]}
              activeOpacity={1}
              onPress={(e) => {
                const x = e.nativeEvent.locationX ?? 0;
                const sec = Math.max(0, Math.min(totalDuration, x / pixelsPerSecond));
                onSeek?.(snapToGrid(sec, totalDuration));
              }}
            >
              {[0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30].filter((t) => t <= totalDuration + 2).map((t) => (
                <Text key={t} style={[styles.rulerText, { left: t * pixelsPerSecond }]}>
                  {t}s
                </Text>
              ))}
            </TouchableOpacity>
            {/* §18.10.10: Draggable playhead */}
            <GestureDetector gesture={playheadPan}>
              <View
                style={[
                  styles.playheadHitArea,
                  { left: 36 + playheadSec * pixelsPerSecond - 12 },
                ]}
              >
              <View style={styles.playhead} />
            </View>
          </GestureDetector>
          {/* Track 1: Text / Overlays — §18.10.6 visibility toggle */}
          <View style={[styles.trackRow, !trackVisibility.text && styles.trackRowDimmed]}>
            <TouchableOpacity
              style={styles.trackLabel}
              onPress={() => toggleTrack('text')}
              activeOpacity={0.7}
            >
              {trackVisibility.text ? (
                <Eye size={14} color={colors.textSecondary} />
              ) : (
                <EyeOff size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <View style={styles.trackContent}>
              {edl.overlays.map((ov, i) => (
                <OverlayBlock
                  key={(ov as EdlTextOverlay).id ?? `overlay-${i}`}
                  overlay={ov as EdlTextOverlay}
                  index={i}
                  isSelected={selectedOverlayIndex === i}
                  pixelsPerSecond={pixelsPerSecond}
                  onPress={() => onSelectOverlay(i)}
                  onOverlayTrim={onOverlayTrim}
                  totalDuration={totalDuration}
                />
              ))}
            </View>
          </View>
          {/* Track 2: Adjust — visibility toggle + trimmable color range */}
          <View style={[styles.trackRow, !trackVisibility.adjust && styles.trackRowDimmed]}>
            <TouchableOpacity
              style={styles.trackLabel}
              onPress={() => toggleTrack('adjust')}
              activeOpacity={0.7}
            >
              {trackVisibility.adjust ? (
                <Eye size={14} color={colors.textSecondary} />
              ) : (
                <EyeOff size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <View style={styles.trackContent}>
              <RangeBlock
                startSec={edl.color?.startSec ?? 0}
                endSec={edl.color?.endSec ?? totalDuration}
                totalDuration={totalDuration}
                pixelsPerSecond={pixelsPerSecond}
                label="Color & filters"
                isSelected={selectedColor}
                onPress={() => {
                  onSelectColor?.();
                  onAdjustPress?.();
                }}
                onTrimStart={onColorTrim ? (v) => onColorTrim('startSec', v) : undefined}
                onTrimEnd={onColorTrim ? (v) => onColorTrim('endSec', v) : undefined}
                blockStyle={[
                  styles.rangeBlockColor,
                  { borderColor: selectedColor ? colors.primary : colors.border },
                ]}
              />
            </View>
          </View>
          {/* Track 3: Music — speaker visibility toggle + trimmable range */}
          <View style={[styles.trackRow, !trackVisibility.music && styles.trackRowDimmed]}>
            <TouchableOpacity
              style={styles.trackLabel}
              onPress={() => toggleTrack('music')}
              activeOpacity={0.7}
            >
              {trackVisibility.music ? (
                <Volume2 size={14} color={colors.textSecondary} />
              ) : (
                <VolumeX size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <View style={styles.trackContent}>
              {edl.audio.musicUrl?.trim() && edl.audio.musicEnabled !== false ? (
                <RangeBlock
                  startSec={edl.audio.musicStartSec ?? 0}
                  endSec={edl.audio.musicEndSec ?? totalDuration}
                  totalDuration={totalDuration}
                  pixelsPerSecond={pixelsPerSecond}
                  label="Music"
                  isSelected={selectedMusic}
                  onPress={onSelectMusic ?? (() => {})}
                  onTrimStart={onMusicTrim ? (v) => onMusicTrim('musicStartSec', v) : undefined}
                  onTrimEnd={onMusicTrim ? (v) => onMusicTrim('musicEndSec', v) : undefined}
                  blockStyle={[
                    styles.rangeBlockMusic,
                    { borderColor: selectedMusic ? colors.primary : colors.border },
                  ]}
                />
              ) : (
                <View style={[styles.audioPlaceholder, styles.audioPlaceholderMusic]}>
                  <Text style={styles.audioPlaceholderText}>Music</Text>
                </View>
              )}
            </View>
          </View>
          {/* Track 4: Voice — trimmable range; waveform when URL present */}
          <View style={[styles.trackRow, !trackVisibility.voice && styles.trackRowDimmed]}>
            <TouchableOpacity
              style={styles.trackLabel}
              onPress={() => toggleTrack('voice')}
              activeOpacity={0.7}
            >
              {trackVisibility.voice ? (
                <Volume2 size={14} color={colors.textSecondary} />
              ) : (
                <VolumeX size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <View style={styles.trackContent}>
              {resolvedAudioUrl && (() => {
                const voiceStart = edl.audio.voiceStartSec ?? 0;
                const voiceEnd = edl.audio.voiceEndSec ?? totalDuration;
                const clipLeft = voiceStart * pixelsPerSecond;
                const clipWidth = Math.max(24, (voiceEnd - voiceStart) * pixelsPerSecond);
                const fullWidthPx = Math.min(widthPx - 48, totalDuration * pixelsPerSecond);
                return (
                  <View
                    style={[styles.voiceWaveformClip, { left: clipLeft, width: clipWidth }]}
                    pointerEvents="none"
                  >
                    <View
                      style={[
                        styles.voiceWaveformInner,
                        {
                          left: -voiceStart * pixelsPerSecond + VOICE_LABEL_ZONE_WIDTH,
                          width: fullWidthPx,
                        },
                      ]}
                    >
                      <WaveformPlaceholder
                        widthPx={fullWidthPx}
                        heightPx={TRACK_HEIGHT - 12}
                      />
                    </View>
                  </View>
                );
              })()}
              <RangeBlock
                startSec={edl.audio.voiceStartSec ?? 0}
                endSec={edl.audio.voiceEndSec ?? totalDuration}
                totalDuration={totalDuration}
                pixelsPerSecond={pixelsPerSecond}
                label="Voice"
                isSelected={selectedVoice}
                labelZoneBackground
                onPress={onSelectVoice ?? (() => {})}
                onTrimStart={onVoiceTrim ? (v) => onVoiceTrim('voiceStartSec', v) : undefined}
                onTrimEnd={onVoiceTrim ? (v) => onVoiceTrim('voiceEndSec', v) : undefined}
                blockStyle={[
                  styles.rangeBlockVoice,
                  { borderColor: selectedVoice ? colors.primary : colors.border },
                ]}
              />
            </View>
          </View>
          {/* Track 5: Video — visibility toggle + §18.10.13 Add-clip "+" */}
          <View style={[styles.trackRow, !trackVisibility.video && styles.trackRowDimmed]}>
            <TouchableOpacity
              style={styles.trackLabel}
              onPress={() => toggleTrack('video')}
              activeOpacity={0.7}
            >
              {trackVisibility.video ? (
                <Eye size={14} color={colors.textSecondary} />
              ) : (
                <EyeOff size={14} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            <View style={styles.trackContent}>
              {edl.timeline.map((clip, i) => (
                <ClipBlock
                  key={clip.id ?? `clip-${i}`}
                  clip={clip}
                  index={i}
                  isSelected={selectedClipIndex === i}
                  playableUrl={resolvedClipUrls[i] ?? null}
                  thumbnailUri={resolvedThumbnailUrls?.[i] ?? null}
                  pixelsPerSecond={pixelsPerSecond}
                  onPress={() => onSelectClip(i)}
                  onClipTrim={onClipTrim}
                  onDragEnd={handleClipDragEnd}
                />
              ))}
            </View>
          </View>
        </View>
        </GestureDetector>
      </ScrollView>
      {/* §18.10.21 Task 2: Floating add button on right of viewport (video track). */}
      {onAddClip && (
        <View
          style={[styles.floatingAddWrap, { top: VIDEO_TRACK_TOP }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.floatingAddBtn}
            onPress={onAddClip}
            activeOpacity={0.8}
          >
            <Plus size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/** §18.10.12: Waveform placeholder when real peaks not available. */
const WaveformPlaceholder = React.memo(function WaveformPlaceholder({ widthPx, heightPx }: { widthPx: number; heightPx: number }) {
  const numBars = Math.max(20, Math.min(80, Math.floor(widthPx / 8)));
  const barWidth = Math.max(2, (widthPx / numBars) * 0.6);
  const gap = widthPx / numBars - barWidth;
  return (
    <View style={[styles.waveformWrap, { height: heightPx }]}>
      {Array.from({ length: numBars }, (_, i) => {
        const t = i / numBars;
        const h = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 20) * Math.cos(t * 7));
        return (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                width: barWidth,
                height: Math.max(4, heightPx * h * 0.6),
                marginLeft: i === 0 ? 0 : gap,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const TRIM_HANDLE_WIDTH = 10;

const ClipBlock = React.memo(function ClipBlock({
  clip,
  index,
  isSelected,
  playableUrl,
  thumbnailUri,
  pixelsPerSecond = PIXELS_PER_SECOND_DEFAULT,
  onPress,
  onClipTrim,
  onDragEnd,
}: {
  clip: EdlTimelineClip;
  index: number;
  isSelected: boolean;
  playableUrl: string | null;
  thumbnailUri?: string | null | undefined;
  pixelsPerSecond?: number;
  onPress: () => void;
  onClipTrim?: (index: number, field: 'inSec' | 'outSec', value: number) => void;
  onDragEnd?: (dragIndex: number, centerSec: number) => void;
}) {
  const duration = Math.max(MIN_CLIP_DURATION, clip.outSec - clip.inSec);
  const width = duration * pixelsPerSecond;
  const left = clip.startSec * pixelsPerSecond;
  const blockWidth = Math.max(24, width);
  const sourceDurationSec = clip.sourceDurationSec ?? clip.outSec + 300;
  const startInRef = useRef(clip.inSec);
  const startOutRef = useRef(clip.outSec);
  const clipInRef = useRef(clip.inSec);
  const clipOutRef = useRef(clip.outSec);
  const sourceDurationRef = useRef(sourceDurationSec);
  clipInRef.current = clip.inSec;
  clipOutRef.current = clip.outSec;
  sourceDurationRef.current = sourceDurationSec;

  const panReorder = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(12)
        .onEnd((e) => {
          const centerSec =
            clip.startSec +
            e.translationX / pixelsPerSecond +
            blockWidth / 2 / pixelsPerSecond;
          onDragEnd?.(index, centerSec);
        }),
    [clip.startSec, index, blockWidth, pixelsPerSecond, onDragEnd]
  );

  const panLeft = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-5, 5])
        .failOffsetY([-15, 15])
        .onStart(() => {
          startInRef.current = clipInRef.current;
        })
        .onUpdate((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newIn = startInRef.current + deltaSec;
          const outSec = clipOutRef.current;
          newIn = Math.max(0, Math.min(outSec - MIN_CLIP_DURATION, newIn));
          onClipTrim?.(index, 'inSec', newIn);
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newIn = startInRef.current + deltaSec;
          newIn = Math.max(
            0,
            Math.min(clipOutRef.current - MIN_CLIP_DURATION, newIn)
          );
          onClipTrim?.(index, 'inSec', newIn);
        }),
    [index, pixelsPerSecond, onClipTrim]
  );

  const panRight = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-5, 5])
        .failOffsetY([-15, 15])
        .onStart(() => {
          startOutRef.current = clipOutRef.current;
        })
        .onUpdate((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newOut = startOutRef.current + deltaSec;
          const inSec = clipInRef.current;
          const maxOut = sourceDurationRef.current;
          newOut = Math.max(
            inSec + MIN_CLIP_DURATION,
            Math.min(maxOut, newOut)
          );
          onClipTrim?.(index, 'outSec', newOut);
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newOut = startOutRef.current + deltaSec;
          newOut = Math.max(
            clipInRef.current + MIN_CLIP_DURATION,
            Math.min(sourceDurationRef.current, newOut)
          );
          onClipTrim?.(index, 'outSec', newOut);
        }),
    [index, pixelsPerSecond, onClipTrim]
  );

  const clipBlockStyle = [
    styles.clipBlock,
    {
      width: blockWidth,
      left,
      borderColor: isSelected ? colors.primary : colors.border,
      borderWidth: isSelected ? 2 : 1,
    },
  ];

  const showTrimHandles = isSelected && onClipTrim && blockWidth > 20;

  return (
    <View style={clipBlockStyle} pointerEvents="box-none">
      {showTrimHandles ? (
        <GestureDetector gesture={panLeft}>
          <View style={styles.trimHandleLeft} />
        </GestureDetector>
      ) : null}
      <GestureDetector gesture={panReorder}>
        <TouchableOpacity
          style={styles.clipBlockContent}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {isSelected && (
            <View style={styles.clipDurationBadge}>
              <Text style={styles.clipDurationText}>{duration.toFixed(1)}s</Text>
            </View>
          )}
          {typeof thumbnailUri === 'string' || playableUrl ? (
            <Image
              source={{ uri: (thumbnailUri ?? playableUrl) ?? '' }}
              style={styles.clipThumb}
              resizeMode="cover"
            />
          ) : null}
          {thumbnailUri === undefined && !playableUrl && (
            <View style={styles.clipThumbLoading}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.clipThumbLoadingText} numberOfLines={1}>Preparing…</Text>
            </View>
          )}
          {thumbnailUri === null && !playableUrl && (
            <View style={styles.clipLabelOverlay}>
              <Text style={styles.clipLabel} numberOfLines={1}>
                {index + 1}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </GestureDetector>
      {showTrimHandles ? (
        <GestureDetector gesture={panRight}>
          <View style={styles.trimHandleRight} />
        </GestureDetector>
      ) : null}
    </View>
  );
});

const MIN_OVERLAY_DURATION = 0.1;

const OverlayBlock = React.memo(function OverlayBlock({
  overlay,
  index,
  isSelected,
  pixelsPerSecond = PIXELS_PER_SECOND_DEFAULT,
  onPress,
  onOverlayTrim,
  totalDuration,
}: {
  overlay: EdlTextOverlay;
  index: number;
  isSelected: boolean;
  pixelsPerSecond?: number;
  onPress: () => void;
  onOverlayTrim?: (overlayIndex: number, field: 'startSec' | 'endSec', value: number) => void;
  totalDuration: number;
}) {
  const duration = Math.max(MIN_OVERLAY_DURATION, overlay.endSec - overlay.startSec);
  const width = duration * pixelsPerSecond;
  const left = overlay.startSec * pixelsPerSecond;
  const blockWidth = Math.max(24, width);
  const startStartRef = useRef(overlay.startSec);
  const startEndRef = useRef(overlay.endSec);

  const panOverlayLeft = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
          startStartRef.current = overlay.startSec;
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newStart = startStartRef.current + deltaSec;
          newStart = Math.max(0, Math.min(overlay.endSec - MIN_OVERLAY_DURATION, newStart));
          onOverlayTrim?.(index, 'startSec', newStart);
        }),
    [index, overlay.startSec, overlay.endSec, pixelsPerSecond, onOverlayTrim]
  );

  const panOverlayRight = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
          startEndRef.current = overlay.endSec;
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newEnd = startEndRef.current + deltaSec;
          newEnd = Math.max(overlay.startSec + MIN_OVERLAY_DURATION, Math.min(totalDuration, newEnd));
          onOverlayTrim?.(index, 'endSec', newEnd);
        }),
    [index, overlay.startSec, overlay.endSec, totalDuration, pixelsPerSecond, onOverlayTrim]
  );

  return (
    <TouchableOpacity
      style={[
        styles.overlayBlock,
        {
          width: blockWidth,
          left,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.overlayLabel} numberOfLines={1}>
        {(overlay.text || 'Text').slice(0, 24)}
      </Text>
      {isSelected && onOverlayTrim && blockWidth > 20 ? (
        <>
          <GestureDetector gesture={panOverlayLeft}>
            <View style={styles.overlayTrimHandleLeft} />
          </GestureDetector>
          <GestureDetector gesture={panOverlayRight}>
            <View style={styles.overlayTrimHandleRight} />
          </GestureDetector>
        </>
      ) : null}
      {isSelected && (
        <View style={styles.overlayDurationBadge}>
          <Text style={styles.overlayDurationText}>{duration.toFixed(1)}s</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const MIN_RANGE_DURATION = 0.1;

/** Single trimmable range block for music, voice, or color track. */
const RangeBlock = React.memo(function RangeBlock({
  startSec,
  endSec,
  totalDuration,
  pixelsPerSecond = PIXELS_PER_SECOND_DEFAULT,
  label,
  isSelected,
  labelZoneBackground = false,
  onPress,
  onTrimStart,
  onTrimEnd,
  blockStyle,
}: {
  startSec: number;
  endSec: number;
  totalDuration: number;
  pixelsPerSecond?: number;
  label: string;
  isSelected: boolean;
  labelZoneBackground?: boolean;
  onPress: () => void;
  onTrimStart?: (value: number) => void;
  onTrimEnd?: (value: number) => void;
  blockStyle: object;
}) {
  const duration = Math.max(MIN_RANGE_DURATION, endSec - startSec);
  const width = duration * pixelsPerSecond;
  const left = startSec * pixelsPerSecond;
  const blockWidth = Math.max(24, width);
  const startStartRef = useRef(startSec);
  const startEndRef = useRef(endSec);
  const startSecRef = useRef(startSec);
  const endSecRef = useRef(endSec);
  const totalDurationRef = useRef(totalDuration);
  startSecRef.current = startSec;
  endSecRef.current = endSec;
  totalDurationRef.current = totalDuration;

  const panLeft = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-5, 5])
        .failOffsetY([-15, 15])
        .onStart(() => {
          startStartRef.current = startSecRef.current;
        })
        .onUpdate((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newStart = startStartRef.current + deltaSec;
          const end = endSecRef.current;
          newStart = Math.max(0, Math.min(end - MIN_RANGE_DURATION, newStart));
          onTrimStart?.(newStart);
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newStart = startStartRef.current + deltaSec;
          newStart = Math.max(0, Math.min(endSecRef.current - MIN_RANGE_DURATION, newStart));
          onTrimStart?.(newStart);
        }),
    [pixelsPerSecond, onTrimStart]
  );

  const panRight = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-5, 5])
        .failOffsetY([-15, 15])
        .onStart(() => {
          startEndRef.current = endSecRef.current;
        })
        .onUpdate((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newEnd = startEndRef.current + deltaSec;
          const start = startSecRef.current;
          newEnd = Math.max(start + MIN_RANGE_DURATION, Math.min(totalDurationRef.current, newEnd));
          onTrimEnd?.(newEnd);
        })
        .onEnd((e) => {
          const deltaSec = e.translationX / pixelsPerSecond;
          let newEnd = startEndRef.current + deltaSec;
          newEnd = Math.max(
            startSecRef.current + MIN_RANGE_DURATION,
            Math.min(totalDurationRef.current, newEnd)
          );
          onTrimEnd?.(newEnd);
        }),
    [pixelsPerSecond, onTrimEnd]
  );

  const showHandles = isSelected && (onTrimStart != null || onTrimEnd != null) && blockWidth > 20;

  return (
    <View style={[styles.rangeBlockBase, blockStyle, { width: blockWidth, left }]} pointerEvents="box-none">
      {showHandles && onTrimStart != null ? (
        <GestureDetector gesture={panLeft}>
          <View style={styles.rangeTrimHandleLeft} />
        </GestureDetector>
      ) : null}
      <TouchableOpacity
        style={[styles.rangeBlockContent, labelZoneBackground && styles.rangeBlockContentWithLabelZone]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {labelZoneBackground ? (
          <View style={[styles.rangeBlockLabelZoneBg, { width: VOICE_LABEL_ZONE_WIDTH }]} />
        ) : null}
        <Text
          style={[styles.rangeBlockLabel, labelZoneBackground && styles.rangeBlockLabelOverWaveform]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isSelected && (
          <View style={styles.rangeDurationBadge}>
            <Text style={styles.rangeDurationText}>{duration.toFixed(1)}s</Text>
          </View>
        )}
      </TouchableOpacity>
      {showHandles && onTrimEnd != null ? (
        <GestureDetector gesture={panRight}>
          <View style={styles.rangeTrimHandleRight} />
        </GestureDetector>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { minHeight: TIMELINE_CONTENT_HEIGHT, position: 'relative' },
  scroll: { flex: 1 },
  inner: { paddingLeft: 40, paddingBottom: 8 },
  ruler: {
    height: RULER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  rulerText: {
    position: 'absolute',
    fontSize: 10,
    color: colors.textSecondary,
  },
  /** §18.10.4: Thicker, blue, visible across all tracks */
  playheadHitArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 10,
    alignItems: 'center',
  },
  playhead: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.primary,
    zIndex: 10,
  },
  trackRow: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    alignItems: 'center',
  },
  trackLabel: {
    width: 36,
    marginLeft: -40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRowDimmed: {
    opacity: 0.45,
  },
  trackContent: {
    flex: 1,
    height: TRACK_HEIGHT - 4,
    position: 'relative',
  },
  clipBlock: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  clipThumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  clipThumbLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    gap: 4,
  },
  clipThumbLoadingText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  clipLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  clipLabelOverlay: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  clipLabelOverlayNoThumb: {
    backgroundColor: 'transparent',
    position: 'relative',
    bottom: undefined,
    left: undefined,
  },
  clipDurationBadge: {
    position: 'absolute',
    top: -14,
    left: '50%',
    marginLeft: -24,
    backgroundColor: '#eab308',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  clipDurationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  clipBlockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimHandleLeft: {
    width: TRIM_HANDLE_WIDTH,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    zIndex: 4,
  },
  trimHandleRight: {
    width: TRIM_HANDLE_WIDTH,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 4,
  },
  /** Clips waveform to the voice trim bounds (orange box). Background layer so label stays on top. */
  voiceWaveformClip: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    overflow: 'hidden',
    zIndex: 0,
  },
  voiceWaveformInner: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  waveformWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  waveformBar: {
    backgroundColor: colors.primary + '99',
    borderRadius: 1,
  },
  /** §18.10.14: Adjust/Filters = gray */
  adjustTrack: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  adjustTrackText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  audioPlaceholderMusic: {
    backgroundColor: '#ec489920',
  },
  audioPlaceholderVoice: {
    backgroundColor: '#f9731620',
  },
  overlayBlock: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  overlayTrimHandleLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.7)',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    zIndex: 4,
  },
  overlayTrimHandleRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.7)',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 4,
  },
  overlayLabel: {
    fontSize: 10,
    color: '#f1f5f9',
  },
  overlayDurationBadge: {
    position: 'absolute',
    top: -10,
    right: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  overlayDurationText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  rangeBlockBase: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    flexDirection: 'row',
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rangeBlockContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  rangeBlockContentWithLabelZone: {
    position: 'relative',
  },
  rangeBlockLabelZoneBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    zIndex: 0,
  },
  rangeBlockLabel: {
    fontSize: 10,
    color: '#f1f5f9',
  },
  rangeBlockLabelOverWaveform: {
    zIndex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  rangeDurationBadge: {
    position: 'absolute',
    top: -10,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  rangeDurationText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  rangeTrimHandleLeft: {
    width: TRIM_HANDLE_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    zIndex: 4,
  },
  rangeTrimHandleRight: {
    width: TRIM_HANDLE_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 4,
  },
  rangeBlockMusic: {
    backgroundColor: '#ec4899',
    borderColor: colors.border,
  },
  rangeBlockVoice: {
    backgroundColor: 'rgba(249, 115, 22, 0.72)',
    borderColor: colors.border,
    zIndex: 2,
  },
  rangeBlockColor: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  audioPlaceholder: {
    backgroundColor: colors.surface + '80',
    borderRadius: 4,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  audioPlaceholderText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  /** §18.10.21 Task 2: Floating add button on right of viewport (video track). */
  floatingAddWrap: {
    position: 'absolute',
    right: 0,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 5,
  },
  floatingAddBtn: {
    width: 36,
    height: TRACK_HEIGHT - 6,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
