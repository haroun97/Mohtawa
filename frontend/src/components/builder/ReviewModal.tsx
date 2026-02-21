import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useWorkflowStore } from '@/store/workflowStore';
import { Loader2, CheckCircle, Edit3 } from 'lucide-react';
import { EdlEditor } from './EdlEditor';

/** Extract S3 key from s3://bucket/key URL */
function parseS3Key(url: string): string | null {
  if (typeof url !== 'string' || !url.startsWith('s3://')) return null;
  const m = url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  return m ? m[2] : null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  executionId: string;
  stepId: string;
  stepOutput: Record<string, unknown>;
  onResolved: () => void;
}

export function ReviewModal({
  open,
  onClose,
  workflowId,
  executionId,
  stepId,
  stepOutput,
  onResolved,
}: Props) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [edlEditorOpen, setEdlEditorOpen] = useState(false);
  const [edlText, setEdlText] = useState('');
  const resolveReview = useWorkflowStore((s) => s.resolveReview);

  const projectId = stepOutput.projectId as string | undefined;
  const draftVideoUrl = stepOutput.draftVideoUrl as string | undefined;
  const edlUrl = stepOutput.edlUrl as string | undefined;

  useEffect(() => {
    if (!open || !draftVideoUrl) {
      setPlayUrl(null);
      return;
    }
    if (draftVideoUrl.startsWith('http')) {
      setPlayUrl(draftVideoUrl);
      return;
    }
    const key = parseS3Key(draftVideoUrl);
    if (!key) {
      setPlayUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!cancelled) setPlayUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setPlayUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, draftVideoUrl]);

  const edlKey = stepOutput.edlKey as string | undefined;
  useEffect(() => {
    if (!editMode || edlText) return;
    const key = edlKey || (edlUrl && parseS3Key(edlUrl)) || (edlUrl && edlUrl.startsWith('video-assets/') ? edlUrl : null);
    if (!key) {
      setEdlText('{}');
      return;
    }
    api.get<{ url: string }>(`/storage/play?key=${encodeURIComponent(key)}`)
      .then((res) => fetch(res.url).then((r) => r.json()))
      .then((edl) => setEdlText(JSON.stringify(edl, null, 2)))
      .catch(() => setEdlText('{}'));
  }, [editMode, edlKey, edlUrl, edlText]);

  const handleApprove = async () => {
    setResolving(true);
    try {
      await resolveReview(workflowId, executionId, stepId, 'approve');
      onResolved();
      onClose();
    } finally {
      setResolving(false);
    }
  };

  const handleEditSave = async () => {
    let approvedEdl: unknown;
    try {
      approvedEdl = JSON.parse(edlText);
    } catch {
      return;
    }
    setResolving(true);
    try {
      await resolveReview(workflowId, executionId, stepId, 'edit', approvedEdl);
      onResolved();
      onClose();
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      {edlEditorOpen &&
        projectId &&
        createPortal(
          <EdlEditor
            projectId={projectId}
            initialDraftVideoUrl={draftVideoUrl}
            onClose={() => setEdlEditorOpen(false)}
            onSaved={() => setEdlEditorOpen(false)}
          />,
          document.body
        )}
      <Dialog open={open && !edlEditorOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review draft</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading video…
            </div>
          ) : playUrl ? (
            <video
              src={playUrl}
              controls
              className="w-full rounded-lg bg-black max-h-[40vh]"
              preload="metadata"
            />
          ) : draftVideoUrl ? (
            <p className="text-sm text-muted-foreground">Could not load video. You can still Approve or Edit EDL.</p>
          ) : null}

          {!editMode ? (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleApprove} disabled={resolving} className="gap-2">
                {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </Button>
              {projectId && (
                <Button variant="outline" onClick={() => setEdlEditorOpen(true)} className="gap-2">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditMode(true)} className="gap-2 text-muted-foreground">
                Edit EDL (JSON)
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Edit EDL JSON and Save to apply.</p>
              <Textarea
                value={edlText}
                onChange={(e) => setEdlText(e.target.value)}
                className="font-mono text-xs min-h-[200px]"
                placeholder='{"timeline":[],"overlays":[],"audio":{},"output":{}}'
              />
              <div className="flex gap-2">
                <Button onClick={handleEditSave} disabled={resolving} className="gap-2">
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save & continue
                </Button>
                <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
