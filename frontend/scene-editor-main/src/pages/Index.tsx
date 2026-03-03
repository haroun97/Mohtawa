import { useState, useCallback } from "react";
import TopBar from "@/components/editor/TopBar";
import VideoPreview from "@/components/editor/VideoPreview";
import PlaybackControls from "@/components/editor/PlaybackControls";
import Timeline from "@/components/editor/Timeline";
import BottomToolbar from "@/components/editor/BottomToolbar";
import ClipToolbar from "@/components/editor/ClipToolbar";
import ExportModal from "@/components/editor/ExportModal";
import SlipMode from "@/components/editor/SlipMode";

const INITIAL_CLIPS = [
  { id: "v1", type: "video" as const, start: 0, duration: 4.8, selected: false },
  { id: "t1", type: "text" as const, start: 0.5, duration: 2.5, label: "Welcome to my video ✨", selected: false },
  { id: "a1", type: "audio" as const, start: 0, duration: 4.8, selected: false },
];

const INITIAL_TEXT_OVERLAYS = [
  { id: "to1", text: "Welcome to my video ✨", x: 50, y: 35, selected: false },
];

const Index = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(1.2);
  const [clips, setClips] = useState(INITIAL_CLIPS);
  const [textOverlays, setTextOverlays] = useState(INITIAL_TEXT_OVERLAYS);
  const [activeTool, setActiveTool] = useState<string | undefined>();
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showSlipMode, setShowSlipMode] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    resolution: "4K",
    frameRate: 60,
    color: "HDR",
  });

  const totalDuration = Math.max(...clips.map((c) => c.start + c.duration), 4.8);
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSelectClip = useCallback((id: string) => {
    setClips((prev) =>
      prev.map((c) => ({ ...c, selected: c.id === id }))
    );
    setSelectedClipId(id);
    setActiveTool(undefined);
  }, []);

  const handleDeselectAll = useCallback(() => {
    setClips((prev) => prev.map((c) => ({ ...c, selected: false })));
    setSelectedClipId(null);
  }, []);

  const handleSelectText = useCallback((id: string) => {
    setTextOverlays((prev) =>
      prev.map((t) => ({ ...t, selected: t.id === id }))
    );
  }, []);

  const handleToolSelect = useCallback((id: string) => {
    setActiveTool((prev) => (prev === id ? undefined : id));
    handleDeselectAll();
  }, [handleDeselectAll]);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleClipTrim = useCallback((id: string, newStart: number, newDuration: number) => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, start: newStart, duration: newDuration } : c))
    );
  }, []);

  const handleSlipConfirm = useCallback((newOffset: number) => {
    // In a real app this would update the source offset within the clip
    setShowSlipMode(false);
  }, []);

  // Slip mode overlay
  if (showSlipMode && selectedClip) {
    return (
      <SlipMode
        clipDuration={selectedClip.duration}
        sourceDuration={10} // simulated source length
        initialOffset={selectedClip.start}
        onConfirm={handleSlipConfirm}
        onCancel={() => setShowSlipMode(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-editor-bg overflow-hidden select-none">
      <TopBar
        projectName="New Project"
        resolution={exportSettings.resolution}
        onExport={() => setShowExport(true)}
        onClose={() => {}}
        onResolutionClick={() => setShowExport(true)}
      />

      <VideoPreview
        isPlaying={isPlaying}
        textOverlays={textOverlays}
        onTogglePlay={handleTogglePlay}
        onSelectText={handleSelectText}
      />

      <PlaybackControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={totalDuration}
        onTogglePlay={handleTogglePlay}
        onUndo={() => {}}
        onRedo={() => {}}
      />

      <Timeline
        clips={clips}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onSelectClip={handleSelectClip}
        onTimeChange={handleTimeChange}
        onClipTrim={handleClipTrim}
      />

      {selectedClip ? (
        <ClipToolbar clipType={selectedClip.type} onSlip={() => setShowSlipMode(true)} />
      ) : (
        <BottomToolbar activeToolId={activeTool} onToolSelect={handleToolSelect} />
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        settings={exportSettings}
        onSettingsChange={setExportSettings}
      />
    </div>
  );
};

export default Index;
