import { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeCategory } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import { MoreHorizontal, Copy, Trash2, EyeOff, Loader2, Download } from 'lucide-react';
import * as Icons from 'lucide-react';
import { hasPlayableAudio, parseS3KeyFromUrl } from '@/lib/audioPlayback';
import { hasFinalVideoOutput, getFinalVideoDownloadUrl, triggerVideoDownload } from '@/lib/videoDownload';
import { api } from '@/lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from './AudioPlayer';

const categoryAccentMap: Record<NodeCategory, string> = {
  trigger: 'border-l-trigger shadow-trigger/5',
  ai: 'border-l-ai shadow-ai/5',
  voice: 'border-l-voice shadow-voice/5',
  video: 'border-l-video shadow-video/5',
  social: 'border-l-social shadow-social/5',
  logic: 'border-l-logic shadow-logic/5',
  utility: 'border-l-utility shadow-utility/5',
  review: 'border-l-amber-500 shadow-amber-500/5',
};

const categoryBgMap: Record<NodeCategory, string> = {
  trigger: 'bg-trigger/8',
  ai: 'bg-ai/8',
  voice: 'bg-voice/8',
  video: 'bg-video/8',
  social: 'bg-social/8',
  logic: 'bg-logic/8',
  utility: 'bg-utility/8',
  review: 'bg-amber-500/8',
};

const categoryTextMap: Record<NodeCategory, string> = {
  trigger: 'text-trigger',
  ai: 'text-ai',
  voice: 'text-voice',
  video: 'text-video',
  social: 'text-social',
  logic: 'text-logic',
  utility: 'text-utility',
  review: 'text-amber-600',
};

const statusDotMap: Record<string, string> = {
  idle: 'bg-muted-foreground/30',
  running: 'bg-primary animate-pulse',
  success: 'bg-trigger',
  error: 'bg-destructive',
  disabled: 'bg-muted-foreground/20',
  waiting_review: 'bg-amber-500',
};

const handleStyle = {
  width: 8,
  height: 8,
  border: '2px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
};

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon ? <Icon className="h-3.5 w-3.5" /> : null;
}

export const WorkflowNodeComponent = memo(({ id, data }: { id: string; data: any }) => {
  const { definition, config, status = 'idle', isSelected } = data;
  const cat = definition.category as NodeCategory;
  const { duplicateNode, removeNode, toggleNodeDisabled, runLog, lastCompletedRunLog, testingNodeId } = useWorkflowStore();
  const stepFromRun = runLog?.steps?.find((s) => s.nodeId === id);
  const stepFromCompleted = lastCompletedRunLog?.steps?.find((s) => s.nodeId === id);
  const isTesting = testingNodeId === id;
  const displayStatus = isTesting ? 'running' : status;
  const isRenderFinalNode = definition.type === 'video.render_final';
  const lastStep =
    isRenderFinalNode && stepFromRun && stepFromRun.output && hasFinalVideoOutput(stepFromRun.output as Record<string, unknown>)
      ? stepFromRun
      : isRenderFinalNode && stepFromCompleted?.output && hasFinalVideoOutput(stepFromCompleted.output as Record<string, unknown>)
        ? stepFromCompleted
        : (stepFromRun ?? stepFromCompleted);
  const hasAudio = definition.type === 'preview-output' && lastStep?.output && hasPlayableAudio(lastStep.output as Record<string, unknown>);
  const isReviewNode = definition.type === 'review.approval_gate';
  const hasFinalVideo = isRenderFinalNode && lastStep?.output && hasFinalVideoOutput(lastStep.output as Record<string, unknown>);
  const draftVideoUrl = isReviewNode && lastStep?.output && typeof (lastStep.output as Record<string, unknown>).draftVideoUrl === 'string'
    ? (lastStep.output as Record<string, unknown>).draftVideoUrl as string
    : undefined;

  const [videoPlayUrl, setVideoPlayUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  useEffect(() => {
    if (!draftVideoUrl) {
      setVideoPlayUrl(null);
      return;
    }
    if (draftVideoUrl.startsWith('http')) {
      setVideoPlayUrl(draftVideoUrl);
      return;
    }
    const key = parseS3KeyFromUrl(draftVideoUrl);
    if (!key) {
      setVideoPlayUrl(null);
      return;
    }
    let cancelled = false;
    setVideoLoading(true);
    api
      .get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!cancelled) setVideoPlayUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setVideoPlayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false);
      });
    return () => { cancelled = true; };
  }, [draftVideoUrl]);

  const inputCount = definition.inputs.length;
  const outputCount = definition.outputs.length;
  const handleSpacing = 24;
  const headerHeight = 36;

  return (
    <div
      className={`node-card border-l-[3px] ${categoryAccentMap[cat]} shadow-md min-w-[200px] max-w-[240px] ${isSelected ? 'selected' : ''} ${status === 'disabled' ? 'opacity-50' : ''}`}
    >
      {/* Input handles */}
      {definition.inputs.map((input: string, i: number) => (
        <Handle
          key={input}
          type="target"
          position={Position.Left}
          id={input}
          style={{
            ...handleStyle,
            top: headerHeight + 12 + i * handleSpacing,
          }}
        />
      ))}

      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--node-border))] ${categoryBgMap[cat]}`}>
        <div className={`shrink-0 ${categoryTextMap[cat]}`}>{getIcon(definition.icon)}</div>
        <span className="text-xs font-medium truncate flex-1">{definition.title}</span>
        {isTesting ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 text-primary animate-spin" />
        ) : (
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDotMap[displayStatus]}`} />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            <DropdownMenuItem onClick={() => duplicateNode(id)}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleNodeDisabled(id)}>
              <EyeOff className="h-3.5 w-3.5 mr-2" /> {status === 'disabled' ? 'Enable' : 'Disable'}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => removeNode(id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body - config summary */}
      <div className="px-3 py-2 space-y-1">
        {definition.fields.slice(0, 2).map((field: any) => {
          const val = config[field.name];
          if (val === undefined || val === '') return null;
          return (
            <div key={field.name} className="flex items-center text-[10px]">
              <span className="text-muted-foreground truncate mr-1">{field.label}:</span>
              <span className="truncate font-medium">{String(val).slice(0, 30)}</span>
            </div>
          );
        })}
        {definition.fields.length === 0 && !hasAudio && !(isReviewNode && draftVideoUrl) && !hasFinalVideo && (
          <p className="text-[10px] text-muted-foreground italic">No configuration</p>
        )}
        {hasAudio && lastStep?.output && (
          <div className="min-w-0 max-h-10 overflow-hidden rounded">
            <AudioPlayer output={lastStep.output as Record<string, unknown>} className="h-8 text-[10px]" />
          </div>
        )}
        {isReviewNode && draftVideoUrl && (
          <div className="min-w-0 rounded overflow-hidden bg-black/80">
            {videoLoading ? (
              <div className="h-16 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : videoPlayUrl ? (
              <video
                src={videoPlayUrl}
                controls
                muted
                playsInline
                className="h-16 w-full object-contain"
                preload="metadata"
              />
            ) : null}
          </div>
        )}
        {hasFinalVideo && lastStep?.output && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-[10px] h-7"
            disabled={downloadingVideo}
            onClick={async (e) => {
              e.stopPropagation();
              setDownloadingVideo(true);
              try {
                const url = await getFinalVideoDownloadUrl(lastStep.output as Record<string, unknown>);
                await triggerVideoDownload(url, 'final-video.mp4');
              } catch (err) {
                console.error('Download failed:', err);
              } finally {
                setDownloadingVideo(false);
              }
            }}
          >
            {downloadingVideo ? (
              <Loader2 className="h-3 w-3 animate-spin" /> 
            ) : (
              <Download className="h-3 w-3" />
            )}{' '}
            {downloadingVideo ? 'Downloading…' : 'Download video'}
          </Button>
        )}
        {/* Show handle labels for multi-output nodes */}
        {outputCount > 1 && (
          <div className="flex gap-1 pt-1">
            {definition.outputs.map((output: string) => (
              <span key={output} className={`text-[9px] px-1.5 py-0.5 rounded ${categoryBgMap[cat]} ${categoryTextMap[cat]} font-medium`}>
                {output}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Output handles */}
      {definition.outputs.map((output: string, i: number) => (
        <Handle
          key={output}
          type="source"
          position={Position.Right}
          id={output}
          style={{
            ...handleStyle,
            top: headerHeight + 12 + i * handleSpacing,
          }}
        />
      ))}
    </div>
  );
});

WorkflowNodeComponent.displayName = 'WorkflowNodeComponent';
