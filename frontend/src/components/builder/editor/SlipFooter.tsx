import { X, Check } from 'lucide-react';

interface SlipFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const instruction =
  'Drag to select the portion of the clip that you want in your video';

export function SlipFooter({ onCancel, onConfirm }: SlipFooterProps) {
  return (
    <footer className="flex-shrink-0 flex flex-col border-t border-border">
      <p className="text-center text-[11px] text-muted-foreground mt-3 px-4">
        {instruction}
      </p>
      <div className="flex items-center justify-between px-8 py-5">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="w-12 h-12 rounded-full bg-editor-surface flex items-center justify-center hover:bg-editor-surface-hover transition-colors min-w-[48px] min-h-[48px]"
        >
          <X size={22} className="text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={onConfirm}
          aria-label="Confirm"
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity min-w-[48px] min-h-[48px]"
        >
          <Check size={22} className="text-primary-foreground" />
        </button>
      </div>
    </footer>
  );
}
