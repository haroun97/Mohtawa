import { useWorkflowStore } from '@/store/workflowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Clock, RotateCcw, ChevronDown, ClipboardCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { hasPlayableAudio } from '@/lib/audioPlayback';
import { hasFinalVideoOutput, getFinalVideoDownloadUrl, triggerVideoDownload } from '@/lib/videoDownload';
import { ReviewModal } from './ReviewModal';

const statusIcon: Record<string, React.ReactNode> = {
  idle: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  running: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  success: <CheckCircle2 className="h-3.5 w-3.5 text-trigger" />,
  error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  waiting_review: <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />,
};

export function RunLogs() {
  const { runLog, lastCompletedRunLog, rerunFromNode, runWorkflow, getActiveWorkflow } = useWorkflowStore();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [reviewStep, setReviewStep] = useState<{ stepId: string; output: Record<string, unknown> } | null>(null);
  const [downloadingStepKey, setDownloadingStepKey] = useState<string | null>(null);
  const workflowId = getActiveWorkflow()?.id ?? '';
  const executionId = runLog?.id ?? '';
  const nodes = getActiveWorkflow()?.nodes ?? [];
  const workflowNodeIds = new Set(nodes.map((n) => n.id));
  const positionByNodeId = new Map(nodes.map((n) => [n.id, n.position]));
  const visibleSteps = runLog.steps
    .filter((step) => workflowNodeIds.has(step.nodeId))
    .slice()
    .sort((a, b) => {
      const posA = positionByNodeId.get(a.nodeId) ?? { x: 0, y: 0 };
      const posB = positionByNodeId.get(b.nodeId) ?? { x: 0, y: 0 };
      return posA.x !== posB.x ? posA.x - posB.x : posA.y - posB.y;
    });

  const toggleStep = (nodeId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  if (!runLog) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">No run logs yet</p>
        <p className="text-xs text-muted-foreground mb-4">Click Run to execute the workflow</p>
        <Button size="sm" onClick={runWorkflow} className="gap-1.5 text-xs">
          Run Workflow
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon[runLog.status] ?? statusIcon.idle}
          <span className="text-xs font-semibold capitalize">{runLog.status.replace('_', ' ')}</span>
        </div>
        {runLog.status !== 'running' && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={runWorkflow}>
            <RotateCcw className="h-3 w-3" /> Re-run
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <AnimatePresence>
          {visibleSteps.map((step, i) => (
            <motion.div
              key={`${runLog.id}-${step.nodeId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border rounded-lg overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left"
                onClick={() => toggleStep(step.nodeId)}
              >
                {statusIcon[step.status] ?? statusIcon.idle}
                <span className="text-xs font-medium flex-1 truncate">{step.nodeTitle}</span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedSteps.has(step.nodeId) ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedSteps.has(step.nodeId) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 space-y-1.5">
                      {step.status === 'waiting_review' && step.output && (
                        <div className="mb-2">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setReviewStep({ stepId: step.nodeId, output: step.output as Record<string, unknown> })}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" /> Review draft
                          </Button>
                        </div>
                      )}
                      {(() => {
                        const stepWithVideo =
                          step.output && hasFinalVideoOutput(step.output as Record<string, unknown>)
                            ? step
                            : lastCompletedRunLog?.steps?.find(
                                (s) => s.nodeId === step.nodeId && s.output && hasFinalVideoOutput(s.output as Record<string, unknown>)
                              );
                        return stepWithVideo?.output && hasFinalVideoOutput(stepWithVideo.output as Record<string, unknown>) ? (
                          <div className="mb-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              disabled={downloadingStepKey === `${runLog.id}-${step.nodeId}`}
                              onClick={async () => {
                                const key = `${runLog.id}-${step.nodeId}`;
                                setDownloadingStepKey(key);
                                try {
                                  const url = await getFinalVideoDownloadUrl(stepWithVideo.output as Record<string, unknown>);
                                  await triggerVideoDownload(url, 'final-video.mp4');
                                } catch (e) {
                                  console.error('Download failed:', e);
                                } finally {
                                  setDownloadingStepKey(null);
                                }
                              }}
                            >
                              {downloadingStepKey === `${runLog.id}-${step.nodeId}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}{' '}
                              {downloadingStepKey === `${runLog.id}-${step.nodeId}` ? 'Downloading…' : 'Download video'}
                            </Button>
                          </div>
                        ) : null;
                      })()}
                      {step.output && (() => {
                        const output = step.output as Record<string, unknown>;
                        const showPlayer = hasPlayableAudio(output);
                        return (
                          <div className="space-y-2">
                            {showPlayer && (
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Play</p>
                                <AudioPlayer output={output} />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Output</p>
                              <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-x-auto">
                                {JSON.stringify(step.output, null, 2)}
                              </pre>
                            </div>
                          </div>
                        );
                      })()}
                      {step.error && (
                        <div>
                          <p className="text-[10px] font-semibold text-destructive mb-1">Error</p>
                          <pre className="text-[10px] bg-destructive/10 text-destructive rounded p-2">{step.error}</pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-6 text-[10px] gap-1"
                            onClick={() => rerunFromNode(step.nodeId)}
                          >
                            <RotateCcw className="h-3 w-3" /> Re-run from here
                          </Button>
                        </div>
                      )}
                      {!step.output && !step.error && step.status === 'idle' && (
                        <p className="text-[10px] text-muted-foreground italic">Queued</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {reviewStep && workflowId && executionId && (
        <ReviewModal
          open={!!reviewStep}
          onClose={() => setReviewStep(null)}
          workflowId={workflowId}
          executionId={executionId}
          stepId={reviewStep.stepId}
          stepOutput={reviewStep.output}
          onResolved={() => setReviewStep(null)}
        />
      )}
    </div>
  );
}
