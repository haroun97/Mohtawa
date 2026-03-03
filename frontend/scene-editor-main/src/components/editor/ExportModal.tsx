import { X } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    resolution: string;
    frameRate: number;
    color: string;
  };
  onSettingsChange: (settings: { resolution: string; frameRate: number; color: string }) => void;
}

const ExportModal = ({ isOpen, onClose, settings, onSettingsChange }: ExportModalProps) => {
  if (!isOpen) return null;

  const SegmentedControl = ({
    options,
    value,
    onChange,
  }: {
    options: { label: string; value: string }[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <div className="ios-segmented flex">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 text-xs font-semibold transition-all duration-200
            ${value === opt.value ? "ios-segmented-active" : "text-muted-foreground"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-editor-bg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[85%] max-w-[340px] bg-editor-surface rounded-3xl p-5 animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">Export Settings</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-editor-bg editor-glass-hover"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Resolution
            </label>
            <SegmentedControl
              options={[
                { label: "HD", value: "HD" },
                { label: "2K", value: "2K" },
                { label: "4K", value: "4K" },
              ]}
              value={settings.resolution}
              onChange={(v) => onSettingsChange({ ...settings, resolution: v })}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Frame Rate
            </label>
            <SegmentedControl
              options={[
                { label: "24", value: "24" },
                { label: "30", value: "30" },
                { label: "60", value: "60" },
              ]}
              value={settings.frameRate.toString()}
              onChange={(v) => onSettingsChange({ ...settings, frameRate: parseInt(v) })}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Colour
            </label>
            <SegmentedControl
              options={[
                { label: "SDR", value: "SDR" },
                { label: "HDR", value: "HDR" },
              ]}
              value={settings.color}
              onChange={(v) => onSettingsChange({ ...settings, color: v })}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          Export Video
        </button>
      </div>
    </div>
  );
};

export default ExportModal;
