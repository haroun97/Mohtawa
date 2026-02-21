import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { edlEditorStore } from '@/store/edlEditorStore';
import type { EDL } from '@/lib/api';

interface TrimSheetProps {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
  selectedClipIndex: number | null;
}

export function TrimSheet({ edl, onEdlChange, selectedClipIndex }: TrimSheetProps) {
  const activeTool = edlEditorStore((s) => s.activeTool);
  const setActiveTool = edlEditorStore((s) => s.setActiveTool);
  const isOpen = activeTool === 'trim' && selectedClipIndex != null && selectedClipIndex < edl.timeline.length;

  const handleClose = (open: boolean) => {
    if (!open) setActiveTool(null);
  };

  const clip = selectedClipIndex != null ? edl.timeline[selectedClipIndex] : undefined;
  if (!clip) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Trim — Clip {selectedClipIndex! + 1}</SheetTitle>
        </SheetHeader>
        <TrimSheetContent edl={edl} onEdlChange={onEdlChange} selectedClipIndex={selectedClipIndex} />
      </SheetContent>
    </Sheet>
  );
}

export function TrimSheetContent({
  edl,
  onEdlChange,
  selectedClipIndex,
}: {
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
  selectedClipIndex: number | null;
}) {
  const clip = selectedClipIndex != null ? edl.timeline[selectedClipIndex] : undefined;

  const [localInSec, setLocalInSec] = useState(clip?.inSec ?? 0);
  const [localOutSec, setLocalOutSec] = useState(clip?.outSec ?? 0);

  useEffect(() => {
    if (clip) {
      setLocalInSec(clip.inSec);
      setLocalOutSec(clip.outSec);
    }
  }, [clip?.inSec, clip?.outSec, selectedClipIndex]);

  const commitTrim = (inSec: number, outSec: number) => {
    if (selectedClipIndex == null || !clip) return;
    let inVal = inSec;
    let outVal = outSec;
    if (outVal <= inVal) outVal = inVal + 0.04;
    if (inVal >= outVal) inVal = outVal - 0.04;
    const timeline = edl.timeline.map((c, i) => {
      if (i !== selectedClipIndex) return c;
      return { ...c, inSec: inVal, outSec: outVal };
    });
    let startSec = 0;
    const withStart = timeline.map((c) => {
      const duration = Math.max(0.04, c.outSec - c.inSec);
      const out = { ...c, startSec };
      startSec += duration;
      return out;
    });
    onEdlChange({ timeline: withStart });
  };

  if (!clip) return null;

  const minOut = localInSec + 0.04;
  const maxIn = Math.max(0, localOutSec - 0.04);

  return (
    <div className="space-y-5 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label>In (s)</Label>
          <Slider
            value={[localInSec]}
            min={0}
            max={maxIn}
            step={0.1}
            onValueChange={([v]) => setLocalInSec(v)}
            onValueCommit={([v]) => commitTrim(v, localOutSec)}
          />
        </div>
        <div className="space-y-3">
          <Label>Out (s)</Label>
          <Slider
            value={[localOutSec]}
            min={minOut}
            max={60}
            step={0.1}
            onValueChange={([v]) => setLocalOutSec(v)}
            onValueCommit={([v]) => commitTrim(localInSec, v)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Duration: {(localOutSec - localInSec).toFixed(1)}s · Start: {clip.startSec.toFixed(1)}s
      </p>
    </div>
  );
}
