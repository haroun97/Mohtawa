import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowNode } from '@/types/workflow';
import { voiceProfilesApi, mediaApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Play, Upload, Edit3 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { hasPlayableAudio } from '@/lib/audioPlayback';

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

interface Props {
  node: WorkflowNode;
  onOpenEdlEditor?: (projectId: string) => void;
}

export function NodeConfigForm({ node, onOpenEdlEditor }: Props) {
  const { updateNodeConfig, runLog, lastCompletedRunLog, runSingleNode } = useWorkflowStore();
  const { definition, config } = node.data;
  const isVoiceTts = definition.type === 'voice.tts';
  const isPreviewOutput = definition.type === 'preview-output';
  const isAutoEdit = definition.type === 'video.auto_edit';
  const isReviewNode = definition.type === 'review.approval_gate';
  const lastRunStep =
    runLog?.steps?.find((s) => s.nodeId === node.id) ??
    lastCompletedRunLog?.steps?.find((s) => s.nodeId === node.id);
  const lastOutput = lastRunStep?.output as Record<string, unknown> | undefined;
  const showLastRunAudio = isPreviewOutput && lastOutput && hasPlayableAudio(lastOutput);
  const reviewProjectId = isReviewNode && lastOutput && typeof lastOutput.projectId === 'string' ? lastOutput.projectId : undefined;
  const clipUploadRef = useRef<HTMLInputElement>(null);
  const [clipUploading, setClipUploading] = useState(false);
  const [clipUploadError, setClipUploadError] = useState<string | null>(null);
  const [testingNode, setTestingNode] = useState(false);
  const { data: voiceProfiles = [] } = useQuery({
    queryKey: ['voice-profiles'],
    queryFn: () => voiceProfilesApi.list(),
    enabled: isVoiceTts,
  });

  const handleChange = (name: string, value: any) => {
    updateNodeConfig(node.id, { [name]: value });
  };

  const handleClipFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setClipUploadError(null);
    setClipUploading(true);
    try {
      const { url } = await mediaApi.upload(file);
      let clips: Array<{ url: string; durationSec?: number }> = [];
      try {
        const raw = config.clips;
        if (typeof raw === 'string' && raw.trim()) {
          clips = JSON.parse(raw);
        } else if (Array.isArray(raw)) {
          clips = raw;
        }
      } catch {
        clips = [];
      }
      if (!Array.isArray(clips)) clips = [];
      clips.push({ url, durationSec: undefined });
      handleChange('clips', JSON.stringify(clips, null, 2));
    } catch (err: any) {
      setClipUploadError(err?.message || 'Upload failed');
    } finally {
      setClipUploading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="opacity-70">{getIcon(definition.icon)}</div>
        <div>
          <h3 className="text-sm font-semibold">{definition.title}</h3>
          <p className="text-[10px] text-muted-foreground">{definition.description}</p>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['inputs', 'advanced', ...(showLastRunAudio ? ['last-run'] : [])]} className="space-y-2">
        {/* Main inputs */}
        <AccordionItem value="inputs" className="border rounded-lg px-3">
          <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">Inputs</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            {definition.fields.map(field => (
              <div key={field.name} className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label className="text-xs">{field.label}</Label>
                  {field.required && <span className="text-destructive text-[10px]">*</span>}
                  {field.help && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">{field.help}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {field.type === 'text' && isVoiceTts && field.name === 'voiceProfileId' ? (
                  <Select
                    value={config[field.name] || ''}
                    onValueChange={v => handleChange(field.name, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select a voice profile..." />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceProfiles.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} {p.trainingStatus === 'ready' ? '✓' : ''}
                        </SelectItem>
                      ))}
                      {voiceProfiles.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No profiles. Create one in Voice profiles.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                ) : field.type === 'text' ? (
                  <Input
                    className="h-8 text-xs"
                    placeholder={field.placeholder}
                    value={config[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                  />
                ) : null}
                {field.type === 'textarea' && isAutoEdit && field.name === 'clips' && (
                  <>
                    <input
                      ref={clipUploadRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                      className="hidden"
                      onChange={handleClipFile}
                    />
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        disabled={clipUploading}
                        onClick={() => clipUploadRef.current?.click()}
                      >
                        <Upload className="h-3 w-3" />
                        {clipUploading ? 'Uploading…' : 'Upload video'}
                      </Button>
                      {clipUploadError && (
                        <p className="text-[10px] text-destructive">{clipUploadError}</p>
                      )}
                    </div>
                  </>
                )}
                {field.type === 'textarea' && (
                  <Textarea
                    className="text-xs min-h-[60px]"
                    placeholder={field.placeholder}
                    value={config[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                  />
                )}
                {field.type === 'number' && (
                  <Input
                    type="number"
                    className="h-8 text-xs"
                    value={config[field.name] ?? field.defaultValue ?? ''}
                    onChange={e => handleChange(field.name, parseFloat(e.target.value) || 0)}
                  />
                )}
                {field.type === 'select' && (
                  <Select value={config[field.name] || ''} onValueChange={v => handleChange(field.name, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === 'toggle' && (
                  <Switch
                    checked={!!config[field.name]}
                    onCheckedChange={v => handleChange(field.name, v)}
                  />
                )}
              </div>
            ))}
            {definition.fields.length === 0 && !showLastRunAudio && (
              <p className="text-xs text-muted-foreground italic">No configurable inputs</p>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Last run output (Preview Output node) */}
        {showLastRunAudio && lastOutput && (
          <AccordionItem value="last-run" className="border rounded-lg px-3">
            <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">Last run output</AccordionTrigger>
            <AccordionContent className="pb-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">Play audio from the latest run</p>
              <AudioPlayer output={lastOutput} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Error handling */}
        <AccordionItem value="advanced" className="border rounded-lg px-3">
          <AccordionTrigger className="text-xs font-semibold py-2 hover:no-underline">Error Handling</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Retry on failure</Label>
              <Switch
                checked={!!config._retryOnFailure}
                onCheckedChange={v => handleChange('_retryOnFailure', v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max retries</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={config._maxRetries ?? 3}
                onChange={e => handleChange('_maxRetries', parseInt(e.target.value) || 0)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {isReviewNode && onOpenEdlEditor && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          disabled={!reviewProjectId}
          onClick={() => reviewProjectId && onOpenEdlEditor(reviewProjectId)}
          title={reviewProjectId ? 'Open video editor for this project' : 'Run the workflow to get a draft, then edit'}
        >
          <Edit3 className="h-3 w-3" /> Edit draft
        </Button>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="w-full gap-1.5 text-xs"
        disabled={testingNode}
        onClick={async () => {
          setTestingNode(true);
          try {
            await runSingleNode(node.id);
          } finally {
            setTestingNode(false);
          }
        }}
      >
        <Play className="h-3 w-3" /> {testingNode ? 'Running…' : 'Test Node'}
      </Button>
    </div>
  );
}
