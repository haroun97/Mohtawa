import { X, ChevronDown, Upload } from "lucide-react";

interface TopBarProps {
  projectName: string;
  resolution: string;
  onExport: () => void;
  onClose: () => void;
  onResolutionClick: () => void;
}

const TopBar = ({ projectName, resolution, onExport, onClose, onResolutionClick }: TopBarProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-editor-bg">
      <button
        onClick={onClose}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-editor-surface editor-glass-hover"
      >
        <X size={18} className="text-foreground" />
      </button>

      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-editor-surface editor-glass-hover">
        <span className="text-sm font-medium text-foreground">{projectName}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onResolutionClick}
          className="px-2.5 py-1 rounded-md bg-editor-surface text-xs font-semibold text-primary"
        >
          {resolution}
        </button>
        <button
          onClick={onExport}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Upload size={16} />
        </button>
      </div>
    </div>
  );
};

export default TopBar;
