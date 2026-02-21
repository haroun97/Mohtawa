import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { edlEditorStore } from '@/store/edlEditorStore';
import { SUBTITLE_PRESETS } from './editorLib';
import type { EDL, EdlTextOverlay } from '@/lib/api';
import { Trash2, Plus } from 'lucide-react';

interface CaptionsSheetProps {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}

export function CaptionsSheet({ edl, onEdlChange }: CaptionsSheetProps) {
  const activeTool = edlEditorStore((s) => s.activeTool);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const isOpen = activeTool === 'captions';
  const handleClose = (open: boolean) => {
    if (!open) setActiveTool(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Captions</SheetTitle>
        </SheetHeader>
        <CaptionsSheetContent edl={edl} onEdlChange={onEdlChange} />
      </SheetContent>
    </Sheet>
  );
}

export function CaptionsSheetContent({
  edl,
  onEdlChange,
}: {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
}) {
  const updateOverlay = (index: number, patch: Partial<EdlTextOverlay>) => {
    const overlays = edl.overlays.map((o, i) =>
      i === index ? { ...o, ...patch } : o
    ) as EdlTextOverlay[];
    onEdlChange({ overlays });
  };
  const removeOverlay = (index: number) => {
    const overlays = edl.overlays.filter((_, i) => i !== index) as EdlTextOverlay[];
    onEdlChange({ overlays });
  };
  const addOverlay = () => {
    const totalDuration = edl.timeline.reduce(
      (acc, c) => acc + Math.max(0.04, c.outSec - c.inSec),
      0
    );
    const newOverlay: EdlTextOverlay = {
      id: `overlay-${edl.overlays.length}-${Date.now()}`,
      type: 'text',
      text: 'New caption',
      startSec: 0,
      endSec: Math.max(5, totalDuration * 0.2),
      stylePreset: 'bold_white_shadow',
    };
    onEdlChange({ overlays: [...edl.overlays, newOverlay] as EdlTextOverlay[] });
  };
  return (
    <div className="space-y-5 py-4">
          {edl.overlays.length > 0 ? (
            edl.overlays.map((o, i) => {
              const overlay = o as EdlTextOverlay;
              return (
                <div key={overlay.id ?? i} className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <Label>Overlay {i + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOverlay(i)}
                      title="Remove overlay"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Text</Label>
                    <Input
                      value={overlay.text}
                      onChange={(e) => updateOverlay(i, { text: e.target.value })}
                      placeholder="Caption text"
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Start (s)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        value={overlay.startSec}
                        onChange={(e) => updateOverlay(i, { startSec: Number(e.target.value) || 0 })}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End (s)</Label>
                      <Input
                        type="number"
                        min={overlay.startSec}
                        step={0.1}
                        value={overlay.endSec}
                        onChange={(e) => updateOverlay(i, { endSec: Number(e.target.value) || overlay.startSec })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Style</Label>
                    <Select
                      value={overlay.stylePreset ?? 'bold_white_shadow'}
                      onValueChange={(v) => updateOverlay(i, { stylePreset: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBTITLE_PRESETS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No text overlays</p>
          )}
          <Button type="button" variant="outline" onClick={addOverlay} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add overlay
          </Button>
        </div>
  );
}
