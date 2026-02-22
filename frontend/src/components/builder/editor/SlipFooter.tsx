import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlipFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
}

const instruction =
  'Drag to select the portion of the clip that you want in your video';

export function SlipFooter({ onCancel, onConfirm }: SlipFooterProps) {
  return (
    <footer className="flex-shrink-0 flex flex-col gap-3 px-4 pb-6 pt-2">
      <p className="text-center text-sm text-muted-foreground">{instruction}</p>
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          aria-label="Confirm"
          className="rounded-full gap-2"
        >
          <Check className="h-5 w-5" />
          Confirm
        </Button>
      </div>
    </footer>
  );
}
