import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ExportScreenProps {
  status: 'rendering' | 'done' | 'failed';
  progress: number;
  previewImageUrl?: string | null;
  outputVideoUrl?: string | null;
  error?: string | null;
  onComplete: () => void;
}

/** Fullscreen export view with live preview (Instagram-style). */
export function ExportScreen({
  status,
  progress,
  previewImageUrl,
  outputVideoUrl,
  error,
  onComplete,
}: ExportScreenProps) {
  const cacheBust = Date.now();
  const previewSrc = previewImageUrl
    ? previewImageUrl.startsWith('data:')
      ? previewImageUrl
      : `${previewImageUrl}${previewImageUrl.includes('?') ? '&' : '?'}v=${cacheBust}`
    : undefined;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-6">
        {/* Phone-style frame around preview */}
        <div className="relative w-full overflow-hidden rounded-[2.5rem] border-[10px] border-zinc-800 bg-black shadow-2xl">
          <div className="aspect-[9/16] w-full">
            {status === 'done' && outputVideoUrl ? (
              <video
                src={outputVideoUrl}
                className="h-full w-full object-contain"
                playsInline
                muted
                autoPlay
                loop
              />
            ) : previewSrc ? (
              <img
                src={previewSrc}
                alt="Export preview"
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
                Preparing…
              </div>
            )}
          </div>
        </div>

        {/* Status and progress */}
        <div className="w-full space-y-4 text-center">
          {status === 'rendering' && (
            <>
              <p className="text-3xl font-semibold tabular-nums">
                {Math.round(progress * 100)}%
              </p>
              <Progress value={progress * 100} className="h-2" />
            </>
          )}
          {status === 'done' && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <p className="text-xl font-medium">Export complete</p>
              <Button onClick={onComplete} size="lg" className="mt-2">
                Done
              </Button>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-500" />
              </div>
              <p className="text-xl font-medium">Export failed</p>
              {error && (
                <p className="text-sm text-zinc-400">{error}</p>
              )}
              <Button onClick={onComplete} variant="outline" size="lg" className="mt-2">
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
