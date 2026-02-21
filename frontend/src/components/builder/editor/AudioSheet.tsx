import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { edlEditorStore } from '@/store/edlEditorStore';
import type { EDL } from '@/lib/api';

interface AudioSheetProps {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}

export function AudioSheetContent({
  edl,
  onEdlChange,
}: {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}) {
  const audio = edl.audio;
  return (
    <div className="space-y-5 py-4">
      <div className="space-y-3">
        <Label>Voice volume (0–1)</Label>
        <Slider
          value={[audio.voiceVolume ?? 1]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={([v]) => onEdlChange({ audio: { ...audio, voiceVolume: v } })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Enable music</Label>
        <Switch
          checked={audio.musicEnabled ?? false}
          onCheckedChange={(v) => onEdlChange({ audio: { ...audio, musicEnabled: v } })}
        />
      </div>
      {(audio.musicEnabled ?? false) && (
        <div className="space-y-3">
          <Label>Music volume (0–1)</Label>
          <Slider
            value={[audio.musicVolume ?? 0.5]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([v]) => onEdlChange({ audio: { ...audio, musicVolume: v } })}
          />
        </div>
      )}
    </div>
  );
}

export function AudioSheet({ edl, onEdlChange }: AudioSheetProps) {
  const activeTool = edlEditorStore((s) => s.activeTool);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const isOpen = activeTool === 'audio';
  const handleClose = (open: boolean) => {
    if (!open) setActiveTool(null);
  };
  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audio</SheetTitle>
        </SheetHeader>
        <AudioSheetContent edl={edl} onEdlChange={onEdlChange} />
      </SheetContent>
    </Sheet>
  );
}
