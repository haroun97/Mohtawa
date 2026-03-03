import { useState, useEffect, useRef } from 'react';

const DEFAULT_PEAK_BUCKETS = 400;

/**
 * Fetches audio from url, decodes it, and returns normalized peak values per bucket.
 * Used to render waveform in the audio track. Returns null if url is invalid or decode fails.
 */
export function useAudioPeaks(
  audioUrl: string | null,
  numBuckets: number = DEFAULT_PEAK_BUCKETS
): { peaks: number[] | null; loading: boolean } {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioUrl || !audioUrl.startsWith('http')) {
      setPeaks(null);
      setLoading(false);
      return;
    }
    if (urlRef.current === audioUrl) return;
    urlRef.current = audioUrl;
    setLoading(true);
    setPeaks(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let cancelled = false;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    (async () => {
      try {
        const res = await fetch(audioUrl, { signal: abortRef.current!.signal });
        if (!res.ok || cancelled) return;
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;
        const channel = buffer.getChannelData(0);
        const length = channel.length;
        const bucketSize = Math.floor(length / numBuckets);
        const out: number[] = [];
        for (let i = 0; i < numBuckets; i++) {
          const start = i * bucketSize;
          let max = 0;
          for (let j = 0; j < bucketSize && start + j < length; j++) {
            const v = Math.abs(channel[start + j]);
            if (v > max) max = v;
          }
          out.push(max);
        }
        const peakMax = Math.max(...out, 1e-6);
        const normalized = out.map((p) => p / peakMax);
        if (!cancelled) setPeaks(normalized);
      } catch (err) {
        if (!cancelled) setPeaks(null);
      } finally {
        if (!cancelled) setLoading(false);
        ctx.close();
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [audioUrl, numBuckets]);

  return { peaks, loading };
}
