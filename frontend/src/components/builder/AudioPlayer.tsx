import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  getDirectAudioUrl,
  getAudioKeyOrFromUrl,
} from '@/lib/audioPlayback';
import { Loader2 } from 'lucide-react';

interface Props {
  output: Record<string, unknown>;
  className?: string;
}

/**
 * Renders a playable audio element from workflow step output.
 * Uses direct HTTPS URL if present, otherwise fetches a presigned play URL from the API.
 */
export function AudioPlayer({ output, className }: Props) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directUrl = getDirectAudioUrl(output);
  const key = getAudioKeyOrFromUrl(output);

  useEffect(() => {
    if (directUrl) {
      setPlayUrl(directUrl);
      setError(null);
      return;
    }
    if (!key) {
      setPlayUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!cancelled) {
          setPlayUrl(res.url);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPlayUrl(null);
          setError(err?.message || 'Failed to load audio');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [directUrl, key]);

  if (error) {
    return (
      <p className="text-[10px] text-destructive">
        {error}
      </p>
    );
  }
  if (loading || !playUrl) {
    return (
      <div className={`flex items-center gap-2 text-[10px] text-muted-foreground ${className ?? ''}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading audio…</span>
      </div>
    );
  }
  return (
    <audio
      src={playUrl}
      controls
      className={`w-full h-8 rounded ${className ?? ''}`}
      preload="metadata"
    />
  );
}
