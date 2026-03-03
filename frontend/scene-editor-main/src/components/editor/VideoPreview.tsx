import { useState } from "react";
import { Play } from "lucide-react";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  selected: boolean;
}

interface VideoPreviewProps {
  isPlaying: boolean;
  textOverlays: TextOverlay[];
  onTogglePlay: () => void;
  onSelectText: (id: string) => void;
}

const VideoPreview = ({ isPlaying, textOverlays, onTogglePlay, onSelectText }: VideoPreviewProps) => {
  return (
    <div className="relative flex items-center justify-center px-4 py-2 bg-editor-bg min-h-0 flex-1">
      {/* 9:16 Preview Container */}
      <div
        className="relative w-full max-w-[240px] bg-editor-preview rounded-2xl overflow-hidden h-full max-h-full"
        style={{ aspectRatio: "9/16" }}
        onClick={onTogglePlay}
      >
        {/* Simulated video content */}
        <div className="absolute inset-0 bg-gradient-to-b from-editor-surface/50 to-editor-preview">
          {/* Grid pattern to simulate video frame */}
          <div className="absolute inset-0 opacity-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-foreground/20 rounded"
                style={{
                  left: `${15 + (i % 3) * 30}%`,
                  top: `${10 + Math.floor(i / 3) * 25}%`,
                  width: `${20 + Math.random() * 10}%`,
                  height: `${8 + Math.random() * 5}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Safe area guides */}
        <div className="absolute inset-4 safe-area-guide rounded-xl pointer-events-none" />

        {/* Play button overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center">
              <Play size={24} className="text-foreground ml-1" />
            </div>
          </div>
        )}

        {/* Text overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className={`absolute cursor-pointer px-3 py-1.5 rounded-lg transition-all duration-150 ${
              overlay.selected
                ? "clip-selected bg-editor-surface/60"
                : "bg-editor-surface/40"
            }`}
            style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, transform: "translate(-50%, -50%)" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectText(overlay.id);
            }}
          >
            <span className="text-foreground text-sm font-semibold whitespace-nowrap">
              {overlay.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoPreview;
