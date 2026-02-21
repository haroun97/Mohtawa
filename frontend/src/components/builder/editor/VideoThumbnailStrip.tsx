import { useRef, useEffect, useState } from 'react';
import { Film } from 'lucide-react';

interface VideoThumbnailStripProps {
  clipUrl: string;
  inSec: number;
  outSec: number;
  widthPx: number;
  heightPx: number;
  /** Optional thumbnail image URL (e.g. from backend); when set, used instead of video frame. */
  thumbnailUrl?: string | null;
}

/**
 * Video track segment thumbnail. MVP: single repeated frame or placeholder.
 * Long-term: multiple frames from backend along clip width.
 */
export function VideoThumbnailStrip({
  clipUrl,
  inSec,
  outSec,
  widthPx,
  heightPx,
  thumbnailUrl,
}: VideoThumbnailStripProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clipUrl || thumbnailUrl) return;
    v.currentTime = inSec;
    const onSeeked = () => setLoaded(true);
    v.addEventListener('seeked', onSeeked);
    return () => v.removeEventListener('seeked', onSeeked);
  }, [clipUrl, inSec, thumbnailUrl]);

  if (thumbnailUrl) {
    return (
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat w-full h-full"
        style={{ backgroundImage: `url(${thumbnailUrl})` }}
      />
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-muted flex items-center justify-center"
      style={{ minHeight: heightPx }}
    >
      <video
        ref={videoRef}
        src={clipUrl}
        muted
        preload="metadata"
        playsInline
        className={loaded ? 'absolute inset-0 w-full h-full object-cover' : 'hidden'}
        style={{ objectFit: 'cover' }}
        onLoadedMetadata={() => {
          if (videoRef.current) videoRef.current.currentTime = inSec;
        }}
      />
      {!loaded && (
        <div className="flex items-center justify-center text-muted-foreground">
          <Film className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}
