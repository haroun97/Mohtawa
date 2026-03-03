import { useState, useRef, useCallback } from "react";
import { X, Check } from "lucide-react";

interface SlipModeProps {
  clipDuration: number;
  sourceDuration: number;
  initialOffset: number;
  onConfirm: (newOffset: number) => void;
  onCancel: () => void;
}

const FILMSTRIP_FRAME_WIDTH = 48;
const FILMSTRIP_FRAME_COUNT = 24;

const SlipMode = ({ clipDuration, sourceDuration, initialOffset, onConfirm, onCancel }: SlipModeProps) => {
  const [offset, setOffset] = useState(initialOffset);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startOffset: number } | null>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);

  const totalFilmstripWidth = FILMSTRIP_FRAME_COUNT * FILMSTRIP_FRAME_WIDTH;
  const selectionWidth = (clipDuration / sourceDuration) * totalFilmstripWidth;
  const selectionLeft = (offset / sourceDuration) * totalFilmstripWidth;
  const maxOffset = sourceDuration - clipDuration;

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      dragRef.current = { startX: clientX, startOffset: offset };
      setIsDragging(true);

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
        if (!dragRef.current) return;
        const dx = cx - dragRef.current.startX;
        const dOffset = -(dx / totalFilmstripWidth) * sourceDuration;
        const newOffset = Math.max(0, Math.min(maxOffset, dragRef.current.startOffset + dOffset));
        setOffset(newOffset);
      };

      const handleEnd = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
        setIsDragging(false);
        dragRef.current = null;
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [offset, sourceDuration, maxOffset, totalFilmstripWidth]
  );

  // Calculate which frame to show as preview (fraction through source)
  const previewFrame = offset / sourceDuration;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-editor-bg animate-fade-in">
      {/* Preview - top section */}
      <div className="flex-1 flex items-center justify-center px-4 py-3 min-h-0">
        <div
          className="relative w-full max-w-[240px] bg-editor-preview rounded-2xl overflow-hidden"
          style={{ aspectRatio: "9/16" }}
        >
          <div
            className="absolute inset-0 transition-all duration-75"
            style={{
              background: `linear-gradient(${135 + previewFrame * 60}deg, 
                hsl(${200 + previewFrame * 40} 15% ${12 + previewFrame * 6}%) 0%, 
                hsl(${220 + previewFrame * 20} 12% ${8 + previewFrame * 4}%) 100%)`,
            }}
          />
          {/* Frame indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-editor-surface/80 backdrop-blur-sm">
            <span className="text-[10px] text-muted-foreground font-medium">
              {offset.toFixed(2)}s — {(offset + clipDuration).toFixed(2)}s
            </span>
          </div>
        </div>
      </div>

      {/* Filmstrip section */}
      <div className="px-4 py-4">
        <div
          ref={filmstripRef}
          className={`relative mx-auto rounded-xl overflow-hidden cursor-grab select-none touch-none
            ${isDragging ? "cursor-grabbing scale-[1.02]" : ""} transition-transform duration-150`}
          style={{ width: totalFilmstripWidth, height: 64 }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {/* Full source filmstrip frames */}
          <div className="flex h-full">
            {Array.from({ length: FILMSTRIP_FRAME_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 h-full border-r border-border/20"
                style={{
                  width: FILMSTRIP_FRAME_WIDTH,
                  background: `linear-gradient(135deg, 
                    hsl(${200 + i * 7} 15% ${12 + (i % 4) * 2}%) 0%, 
                    hsl(${210 + i * 5} 12% ${9 + (i % 3) * 2}%) 100%)`,
                }}
              />
            ))}
          </div>

          {/* Dimmed non-selected areas */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-editor-bg/60 pointer-events-none transition-all duration-75"
            style={{ width: selectionLeft }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-editor-bg/60 pointer-events-none transition-all duration-75"
            style={{ left: selectionLeft + selectionWidth }}
          />

          {/* Selection window */}
          <div
            className="absolute top-0 bottom-0 border-2 border-selection rounded-md pointer-events-none transition-all duration-75"
            style={{ left: selectionLeft, width: selectionWidth }}
          >
            {/* Left grab handle */}
            <div className="absolute left-0 top-0 bottom-0 w-2 flex items-center justify-center">
              <div className="w-[3px] h-5 rounded-full bg-selection" />
            </div>
            {/* Right grab handle */}
            <div className="absolute right-0 top-0 bottom-0 w-2 flex items-center justify-center">
              <div className="w-[3px] h-5 rounded-full bg-selection" />
            </div>
          </div>
        </div>

        {/* Instruction text */}
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Drag to select the portion of the clip that you want in your video
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-border">
        <button
          onClick={onCancel}
          className="w-12 h-12 rounded-full bg-editor-surface flex items-center justify-center hover:bg-editor-surface-hover transition-colors"
        >
          <X size={22} className="text-muted-foreground" />
        </button>
        <button
          onClick={() => onConfirm(offset)}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <Check size={22} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default SlipMode;
