import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { edlEditorStore } from '@/store/edlEditorStore';
import type { EDL } from '@/lib/api';

interface AdjustSheetProps {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}

const DEFAULT_COLOR = { saturation: 1, contrast: 1, vibrance: 1 };

export function AdjustSheetContent({
  edl,
  onEdlChange,
}: {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}) {
  const color = edl.color ?? DEFAULT_COLOR;
  return (
    <div className="space-y-5 py-4">
      <div className="space-y-3">
        <Label>Saturation (0.8–1.3)</Label>
        <Slider
          value={[color.saturation ?? 1]}
          min={0.8}
          max={1.3}
          step={0.05}
          onValueChange={([v]) => onEdlChange({ color: { ...color, saturation: v } })}
        />
      </div>
      <div className="space-y-3">
        <Label>Contrast (0.9–1.2)</Label>
        <Slider
          value={[color.contrast ?? 1]}
          min={0.9}
          max={1.2}
          step={0.05}
          onValueChange={([v]) => onEdlChange({ color: { ...color, contrast: v } })}
        />
      </div>
      <div className="space-y-3">
        <Label>Vibrance (0.8–1.3)</Label>
        <Slider
          value={[color.vibrance ?? 1]}
          min={0.8}
          max={1.3}
          step={0.05}
          onValueChange={([v]) => onEdlChange({ color: { ...color, vibrance: v } })}
        />
      </div>
      <Button variant="outline" onClick={() => onEdlChange({ color: { ...DEFAULT_COLOR } })} className="w-full">
        Reset
      </Button>
    </div>
  );
}

export function AdjustSheet({ edl, onEdlChange }: AdjustSheetProps) {
  const activeTool = edlEditorStore((s) => s.activeTool);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const isOpen = activeTool === 'adjust';
  const handleClose = (open: boolean) => {
    if (!open) setActiveTool(null);
  };
  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adjust</SheetTitle>
        </SheetHeader>
        <AdjustSheetContent edl={edl} onEdlChange={onEdlChange} />
      </SheetContent>
    </Sheet>
  );
}
