import { useState, useRef, useCallback } from "react";

interface Clip {
  id: string;
  type: "video" | "text" | "audio";
  start: number;
  duration: number;
  label?: string;
  selected?: boolean;
}

interface TimelineProps {
  clips: Clip[];
  currentTime: number;
  totalDuration: number;
  onSelectClip: (id: string) => void;
  onTimeChange: (time: number) => void;
  onClipTrim?: (id: string, newStart: number, newDuration: number) => void;
}

const PIXELS_PER_SECOND = 80;
const TRACK_HEIGHT = 48;
const MIN_CLIP_DURATION = 0.2;

const Timeline = ({ clips, currentTime, totalDuration, onSelectClip, onTimeChange, onClipTrim }: TimelineProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [trimState, setTrimState] = useState<{
    clipId: string;
    edge: "left" | "right";
    initialX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);
  const [trimPreview, setTrimPreview] = useState<{ clipId: string; start: number; duration: number } | null>(null);
  const [isDimmed, setIsDimmed] = useState(false);

  const timelineWidth = totalDuration * PIXELS_PER_SECOND;
  const playheadPosition = currentTime * PIXELS_PER_SECOND;

  const videoClips = clips.filter((c) => c.type === "video");
  const textClips = clips.filter((c) => c.type === "text");
  const audioClips = clips.filter((c) => c.type === "audio");

  const getClipVisuals = (clip: Clip) => {
    if (trimPreview && trimPreview.clipId === clip.id) {
      return { start: trimPreview.start, duration: trimPreview.duration };
    }
    return { start: clip.start, duration: clip.duration };
  };

  const handleTrimStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, clipId: string, edge: "left" | "right") => {
      e.stopPropagation();
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      setTrimState({
        clipId,
        edge,
        initialX: clientX,
        initialStart: clip.start,
        initialDuration: clip.duration,
      });
      setIsDimmed(true);

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        setTrimState((prev) => {
          if (!prev) return null;
          const dx = cx - prev.initialX;
          const dt = dx / PIXELS_PER_SECOND;

          let newStart = prev.initialStart;
          let newDuration = prev.initialDuration;

          if (prev.edge === "left") {
            const maxShift = prev.initialDuration - MIN_CLIP_DURATION;
            const shift = Math.max(-prev.initialStart, Math.min(dt, maxShift));
            newStart = prev.initialStart + shift;
            newDuration = prev.initialDuration - shift;
          } else {
            newDuration = Math.max(MIN_CLIP_DURATION, prev.initialDuration + dt);
          }

          setTrimPreview({ clipId: prev.clipId, start: newStart, duration: newDuration });
          return prev;
        });
      };

      const handleEnd = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);

        setTrimPreview((preview) => {
          if (preview && onClipTrim) {
            onClipTrim(preview.clipId, preview.start, preview.duration);
          }
          return null;
        });
        setTrimState(null);
        setIsDimmed(false);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [clips, onClipTrim]
  );

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (trimState) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft || 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = Math.max(0, Math.min(x / PIXELS_PER_SECOND, totalDuration));
      onTimeChange(time);
    },
    [totalDuration, onTimeChange, trimState]
  );

  const renderThumbnails = (clip: Clip) => {
    const { duration } = getClipVisuals(clip);
    const width = duration * PIXELS_PER_SECOND;
    const thumbCount = Math.max(1, Math.floor(width / 40));
    return (
      <div className="flex h-full">
        {Array.from({ length: thumbCount }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            style={{
              background: `linear-gradient(135deg, 
                hsl(${200 + i * 15} 15% ${14 + (i % 3) * 2}%) 0%, 
                hsl(${210 + i * 10} 12% ${11 + (i % 2) * 3}%) 100%)`,
            }}
          />
        ))}
      </div>
    );
  };

  const renderWaveform = (clip: Clip) => {
    const { duration } = getClipVisuals(clip);
    const width = duration * PIXELS_PER_SECOND;
    const barCount = Math.max(1, Math.floor(width / 4));
    return (
      <div className="flex items-center h-full gap-px px-1">
        {Array.from({ length: barCount }).map((_, i) => {
          const height = 20 + Math.sin(i * 0.8) * 30 + Math.random() * 25;
          return (
            <div
              key={i}
              className="flex-shrink-0 w-[2px] rounded-full bg-audio-waveform/70"
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    );
  };

  const renderClip = (clip: Clip) => {
    const { start, duration } = getClipVisuals(clip);
    const width = duration * PIXELS_PER_SECOND;
    const left = start * PIXELS_PER_SECOND;
    const isTrimming = trimState?.clipId === clip.id;

    const bgClass =
      clip.type === "video"
        ? "bg-editor-surface"
        : clip.type === "text"
        ? "bg-text-layer/30"
        : "bg-audio-waveform/10";

    const borderClass = clip.type === "text" ? "border border-text-layer/40" : clip.type === "audio" ? "border border-audio-waveform/20" : "";

    return (
      <div
        key={clip.id}
        className={`absolute top-1 bottom-1 rounded-lg overflow-hidden cursor-pointer transition-all
          ${bgClass} ${borderClass}
          ${clip.selected ? "clip-selected" : "hover:ring-1 hover:ring-foreground/20"}
          ${isTrimming ? "z-20" : ""}`}
        style={{ left, width, transition: isTrimming ? "none" : undefined }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectClip(clip.id);
        }}
      >
        {clip.type === "video" && renderThumbnails(clip)}
        {clip.type === "audio" && renderWaveform(clip)}
        {clip.type === "text" && (
          <div className="flex items-center h-full px-2">
            <span className="text-[10px] font-medium text-text-layer-foreground truncate">
              {clip.label || "Text"}
            </span>
          </div>
        )}

        {/* Duration label on selected or trimming */}
        {(clip.selected || isTrimming) && (
          <div className={`absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold
            ${isTrimming ? "bg-primary text-primary-foreground" : "bg-selection text-selection-foreground"}`}>
            {duration.toFixed(1)}s
          </div>
        )}

        {/* Trim handles - only on selected clips */}
        {clip.selected && (
          <>
            {/* Left handle */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center
                group touch-none ${isTrimming && trimState?.edge === "left" ? "bg-selection/40" : ""}`}
              onMouseDown={(e) => handleTrimStart(e, clip.id, "left")}
              onTouchStart={(e) => handleTrimStart(e, clip.id, "left")}
            >
              <div className="w-[3px] h-6 rounded-full bg-selection group-hover:bg-selection group-hover:shadow-[0_0_6px_hsl(var(--selection)/0.5)] transition-all" />
            </div>
            {/* Right handle */}
            <div
              className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-10 flex items-center justify-center
                group touch-none ${isTrimming && trimState?.edge === "right" ? "bg-selection/40" : ""}`}
              onMouseDown={(e) => handleTrimStart(e, clip.id, "right")}
              onTouchStart={(e) => handleTrimStart(e, clip.id, "right")}
            >
              <div className="w-[3px] h-6 rounded-full bg-selection group-hover:bg-selection group-hover:shadow-[0_0_6px_hsl(var(--selection)/0.5)] transition-all" />
            </div>
          </>
        )}
      </div>
    );
  };

  const renderTimeMarkers = () => {
    const markers = [];
    for (let i = 0; i <= Math.ceil(totalDuration); i++) {
      markers.push(
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: i * PIXELS_PER_SECOND }}
        >
          <span className="text-[9px] text-muted-foreground font-medium">{i}s</span>
          <div className="w-px h-2 bg-muted-foreground/30 mt-0.5" />
        </div>
      );
      if (i < totalDuration) {
        markers.push(
          <div
            key={`${i}-half`}
            className="absolute top-3 w-px h-1.5 bg-muted-foreground/15"
            style={{ left: (i + 0.5) * PIXELS_PER_SECOND }}
          />
        );
      }
    }
    return markers;
  };

  return (
    <div className={`bg-editor-timeline border-t border-border transition-all duration-200 ${isDimmed ? "ring-1 ring-selection/20" : ""}`}>
      {/* Dim overlay when trimming */}
      {isDimmed && (
        <div className="absolute inset-0 bg-editor-bg/30 pointer-events-none z-0" />
      )}

      {/* Time markers */}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar smooth-scroll relative z-1"
        onClick={handleTimelineClick}
      >
        <div className="relative" style={{ width: timelineWidth + 40, minHeight: 20 }}>
          <div className="relative h-5 ml-2">{renderTimeMarkers()}</div>
        </div>

        {/* Tracks */}
        <div className="relative" style={{ width: timelineWidth + 40 }}>
          <div className="relative ml-2" style={{ height: TRACK_HEIGHT }}>
            {videoClips.map(renderClip)}
          </div>
          <div className="relative ml-2" style={{ height: TRACK_HEIGHT - 12 }}>
            {textClips.map(renderClip)}
          </div>
          <div className="relative ml-2" style={{ height: TRACK_HEIGHT - 8 }}>
            {audioClips.map(renderClip)}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-playhead z-10 pointer-events-none"
            style={{ left: playheadPosition + 8 }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-playhead rounded-full shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
