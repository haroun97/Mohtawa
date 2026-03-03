import { Play, Pause, Undo2, Redo2 } from 'lucide-react';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-transparent md:px-5">
      <button
        type="button"
        onClick={onTogglePlay}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-opacity min-w-[44px] min-h-[44px] md:min-w-10 md:min-h-10"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={18} />
        ) : (
          <Play size={18} className="ml-0.5" />
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
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-9 h-9 flex items-center justify-center rounded-full editor-glass-hover min-w-[44px] min-h-[44px] md:min-w-9 md:min-h-9 disabled:opacity-50 disabled:pointer-events-none text-foreground/90"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="w-9 h-9 flex items-center justify-center rounded-full editor-glass-hover min-w-[44px] min-h-[44px] md:min-w-9 md:min-h-9 disabled:opacity-50 disabled:pointer-events-none text-foreground/90"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>
    </div>
  );
}
