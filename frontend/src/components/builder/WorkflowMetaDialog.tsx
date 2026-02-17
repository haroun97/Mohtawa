import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowMetaDialog({ open, onOpenChange }: Props) {
  const { getActiveWorkflow, updateWorkflowMeta } = useWorkflowStore();
  const workflow = getActiveWorkflow();

  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(workflow?.status || 'draft');

  if (!workflow) return null;

  const handleSave = () => {
    updateWorkflowMeta({ name: name || 'Untitled Workflow', description, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Workflow name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-description">Description</Label>
            <Textarea
              id="wf-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this workflow do?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
