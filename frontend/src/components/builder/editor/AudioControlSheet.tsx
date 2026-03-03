import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import type { EDL } from '@/lib/api';

const SHEET_BG = '#1b1f24';
const TRACK_MUTED = '#2a2e34';
const TRACK_ACTIVE = '#ffd400';

type AudioTab = 'original' | 'voiceover' | 'music';

function toPercent(v: number): number {
  return Math.round(v * 100);
}
function fromPercent(p: number): number {
  return Math.max(0, Math.min(100, p)) / 100;
}

/** Custom volume slider: yellow fill, white knob, 0-100 display. */
function VolumeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn('flex items-center gap-4 w-full', className)}>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center py-4"
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v ?? 0)}
      >
        <SliderPrimitive.Track
          className="relative h-2 w-full grow overflow-hidden rounded-full"
          style={{ backgroundColor: TRACK_MUTED }}
        >
          <SliderPrimitive.Range
            className="absolute h-full rounded-full transition-[width] duration-100"
            style={{ width: `${pct}%`, backgroundColor: TRACK_ACTIVE }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-7 w-7 rounded-full border-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1b1f24] disabled:pointer-events-none cursor-grab active:cursor-grabbing"
          style={{ minWidth: 44, minHeight: 44 }}
        />
      </SliderPrimitive.Root>
      <span className="text-base font-semibold text-white tabular-nums w-10 text-right shrink-0">
        {Math.round(value)}
      </span>
    </div>
  );
}

interface AudioControlSheetProps {
  open: boolean;
  onClose: () => void;
  edl: EDL;
  onEdlChange: (patch: Partial<EDL> | ((prev: EDL) => EDL)) => void;
  /** When opening, show this tab first (e.g. "original" when opened from a video clip). */
  initialTab?: AudioTab;
}

const TABS: { id: AudioTab; label: string }[] = [
  { id: 'original', label: 'Original video' },
  { id: 'voiceover', label: 'Voice over' },
  { id: 'music', label: 'Background music' },
];

export function AudioControlSheet({ open, onClose, edl, onEdlChange, initialTab = 'original' }: AudioControlSheetProps) {
  const audio = edl.audio;
  const [tab, setTab] = useState<AudioTab>(initialTab);

  const [originalVolume, setOriginalVolume] = useState(() => toPercent(audio.originalVolume ?? 1));
  const [applyToAll, setApplyToAll] = useState(audio.applyOriginalToAll ?? true);
  const [voiceVolume, setVoiceVolume] = useState(() => toPercent(audio.voiceVolume ?? 1));
  const [musicEnabled, setMusicEnabled] = useState(audio.musicEnabled ?? false);
  const [musicVolume, setMusicVolume] = useState(() => toPercent(audio.musicVolume ?? 0.5));

  const sheetRef = useRef<HTMLDivElement>(null);

  const syncFromEdl = useCallback(() => {
    setOriginalVolume(toPercent(audio.originalVolume ?? 1));
    setApplyToAll(audio.applyOriginalToAll ?? true);
    setVoiceVolume(toPercent(audio.voiceVolume ?? 1));
    setMusicEnabled(audio.musicEnabled ?? false);
    setMusicVolume(toPercent(audio.musicVolume ?? 0.5));
  }, [audio.originalVolume, audio.applyOriginalToAll, audio.voiceVolume, audio.musicEnabled, audio.musicVolume]);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      syncFromEdl();
    }
  }, [open, initialTab, syncFromEdl]);

  const handleConfirm = useCallback(() => {
    if (tab === 'original') {
      onEdlChange({
        audio: {
          ...edl.audio,
          originalVolume: fromPercent(originalVolume),
          applyOriginalToAll: applyToAll,
        },
      });
    } else if (tab === 'voiceover') {
      onEdlChange({
        audio: {
          ...edl.audio,
          voiceVolume: fromPercent(voiceVolume),
        },
      });
    } else {
      onEdlChange({
        audio: {
          ...edl.audio,
          musicEnabled: musicEnabled,
          musicVolume: fromPercent(musicVolume),
        },
      });
    }
    onClose();
  }, [tab, originalVolume, applyToAll, voiceVolume, musicEnabled, musicVolume, edl.audio, onEdlChange, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[240] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            aria-hidden
          />
          <motion.div
            ref={sheetRef}
            className="fixed left-0 right-0 bottom-0 z-[241] rounded-t-[24px] overflow-hidden shadow-2xl"
            style={{ backgroundColor: SHEET_BG }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 300) onClose();
            }}
          >
            <div className="pt-2 pb-6 px-5 max-h-[70vh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
              {/* Segment tabs */}
              <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: TRACK_MUTED }}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      tab === t.id
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:text-white'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'original' && (
                <>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={applyToAll}
                        onClick={() => setApplyToAll((a) => !a)}
                        className={cn(
                          'relative w-11 h-6 rounded-full shrink-0 transition-colors',
                          applyToAll ? 'bg-[#ffd400]' : 'bg-white/20'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                            applyToAll ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-white truncate">
                        Apply volume to all video clips
                      </span>
                    </div>
                  </div>
                  <VolumeSlider value={originalVolume} onChange={setOriginalVolume} />
                </>
              )}

              {tab === 'voiceover' && (
                <>
                  <p className="text-sm text-white/80 mb-4">Voice over volume</p>
                  <VolumeSlider value={voiceVolume} onChange={setVoiceVolume} />
                </>
              )}

              {tab === 'music' && (
                <>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={musicEnabled}
                        onClick={() => setMusicEnabled((e) => !e)}
                        className={cn(
                          'relative w-11 h-6 rounded-full shrink-0 transition-colors',
                          musicEnabled ? 'bg-[#ffd400]' : 'bg-white/20'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                            musicEnabled ? 'left-6' : 'left-1'
                          )}
                        />
                      </button>
                      <span className="text-sm font-medium text-white">Enable music</span>
                    </div>
                  </div>
                  {musicEnabled && (
                    <>
                      <p className="text-sm text-white/80 mb-4">Music volume</p>
                      <VolumeSlider value={musicVolume} onChange={setMusicVolume} />
                    </>
                  )}
                </>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-12 h-12 rounded-full bg-white text-[#1b1f24] flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all"
                  aria-label="Apply"
                >
                  <Check size={24} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
