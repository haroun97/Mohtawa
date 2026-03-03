import { useRef, useLayoutEffect } from 'react';

const WAVEFORM_PURPLE = 'hsl(270, 60%, 65%)';
const WAVEFORM_PINK = 'hsl(330, 70%, 65%)';
const BAR_WIDTH_TARGET = 2;
const MAX_BAR_HEIGHT_RATIO = 0.85;
const MIN_BAR_HEIGHT_RATIO = 0.08;

/**
 * Resample peak array to target length (max over each bucket).
 */
function resamplePeaks(peaks: number[], targetLength: number): number[] {
  if (targetLength >= peaks.length) return peaks;
  const out: number[] = [];
  const step = peaks.length / targetLength;
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(peaks.length, Math.floor((i + 1) * step));
    let max = 0;
    for (let j = start; j < end; j++) {
      if ((peaks[j] ?? 0) > max) max = peaks[j] ?? 0;
    }
    out.push(max);
  }
  return out;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: number[],
  displayW: number,
  displayH: number
) {
  const numBars = Math.max(50, Math.min(peaks.length, Math.floor(displayW / BAR_WIDTH_TARGET)));
  const sampled = resamplePeaks(peaks, numBars);
  const totalBarWidth = displayW / numBars;
  const barW = Math.max(1, totalBarWidth);
  const centerX = (i: number) => (i + 0.5) * totalBarWidth;
  const maxBarH = displayH * MAX_BAR_HEIGHT_RATIO;
  const minBarH = displayH * MIN_BAR_HEIGHT_RATIO;
  const midY = displayH / 2;

  const gradient = ctx.createLinearGradient(0, 0, displayW, 0);
  gradient.addColorStop(0, WAVEFORM_PURPLE);
  gradient.addColorStop(1, WAVEFORM_PINK);
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.lineWidth = barW;

  ctx.clearRect(0, 0, displayW, displayH);
  for (let i = 0; i < sampled.length; i++) {
    const p = sampled[i] ?? 0;
    const barH = Math.max(minBarH, p * maxBarH);
    const y1 = midY - barH / 2;
    const y2 = midY + barH / 2;
    const x = centerX(i);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }
}

export interface AudioWaveformCanvasProps {
  peaks: number[];
  widthPx: number;
  heightPx: number;
  /** Optional: CSS class for the wrapper (e.g. flex-1 min-w-0 h-full). */
  className?: string;
}

/**
 * Renders waveform as dense vertical bars with purple→pink gradient and rounded ends.
 * Uses canvas for performance and smooth gradient. Bar count scales with width.
 */
export function AudioWaveformCanvas({
  peaks,
  widthPx,
  heightPx,
  className = '',
}: AudioWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const w = Math.round(widthPx);
    const h = Math.round(heightPx);
    if (!canvas || peaks.length === 0 || w < 4 || h < 4) return;

    const dpr = window.devicePixelRatio ?? 1;
    const displayW = Math.round(w * dpr);
    const displayH = Math.round(h * dpr);

    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWaveform(ctx, peaks, displayW, displayH);
  }, [peaks, widthPx, heightPx]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: Math.round(widthPx), height: Math.round(heightPx), display: 'block', verticalAlign: 'middle' }}
      aria-hidden
    />
  );
}
