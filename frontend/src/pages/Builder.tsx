import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '@/store/workflowStore';
import { TopBar } from '@/components/builder/TopBar';
import { NodeLibrary } from '@/components/builder/NodeLibrary';
import { FlowCanvas } from '@/components/builder/FlowCanvas';
import { InspectorPanel } from '@/components/builder/InspectorPanel';
import { CommandPalette } from '@/components/builder/CommandPalette';
import { WorkflowMetaDialog } from '@/components/builder/WorkflowMetaDialog';
import { EdlEditor } from '@/components/builder/EdlEditor';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    fetchWorkflow, activeWorkflowId, getActiveWorkflow,
    saveWorkflowToApi, undo, redo, removeNode, selectedNodeId, isLoading,
  } = useWorkflowStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [edlEditorProjectId, setEdlEditorProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
  }, [id, fetchWorkflow]);

  const workflow = getActiveWorkflow();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      saveWorkflowToApi().then(() => {
        toast.success('Workflow saved');
      });
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedNodeId) {
        removeNode(selectedNodeId);
      }
    }
  }, [saveWorkflowToApi, undo, redo, removeNode, selectedNodeId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading && !workflow) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Workflow not found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <TopBar
        onToggleLibrary={() => setLibraryOpen(!libraryOpen)}
        libraryOpen={libraryOpen}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        {libraryOpen && <NodeLibrary />}
        <FlowCanvas />
        <InspectorPanel onOpenEdlEditor={setEdlEditorProjectId} />
      </div>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <WorkflowMetaDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {edlEditorProjectId != null && (
        <EdlEditor
          projectId={edlEditorProjectId}
          onClose={() => setEdlEditorProjectId(null)}
          onSaved={() => setEdlEditorProjectId(null)}
        />
      )}
    </div>
  );
}
