import { Play, Pause, Undo2, Redo2 } from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
};

const PlaybackControls = ({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onUndo,
  onRedo,
}: PlaybackControlsProps) => {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 bg-editor-bg">
      <button
        onClick={onTogglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-editor-surface editor-glass-hover"
      >
        {isPlaying ? (
          <Pause size={18} className="text-foreground" />
        ) : (
          <Play size={18} className="text-foreground ml-0.5" />
        )}
      </button>

      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-foreground tabular-nums">
          {formatTime(currentTime)}
        </span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          className="w-9 h-9 flex items-center justify-center rounded-full editor-glass-hover"
        >
          <Undo2 size={16} className="text-muted-foreground" />
        </button>
        <button
          onClick={onRedo}
          className="w-9 h-9 flex items-center justify-center rounded-full editor-glass-hover"
        >
          <Redo2 size={16} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default PlaybackControls;
