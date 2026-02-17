import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '@/store/workflowStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Undo2, Redo2, PanelLeft, Settings2, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useRef, useState } from 'react';

interface TopBarProps {
  onToggleLibrary: () => void;
  libraryOpen: boolean;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ onToggleLibrary, libraryOpen, onOpenCommandPalette, onOpenSettings }: TopBarProps) {
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();
  const { getActiveWorkflow, updateWorkflowName, saveStatus, triggerSave, undo, redo, runWorkflow } = useWorkflowStore();
  const workflow = getActiveWorkflow();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!workflow) return null;

  const handleNameSubmit = () => {
    setEditing(false);
    if (inputRef.current) {
      updateWorkflowName(inputRef.current.value || 'Untitled Workflow');
    }
  };

  return (
    <header className="h-12 border-b bg-card/80 backdrop-blur-sm flex items-center px-3 gap-2 shrink-0 z-50">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')} aria-label="Back to dashboard">
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="h-5 w-px bg-border" />

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleLibrary} aria-label="Toggle node library">
        <PanelLeft className="h-4 w-4" />
      </Button>

      {/* Workflow name */}
      <div className="flex items-center gap-1.5 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            className="bg-transparent border border-border rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            defaultValue={workflow.name}
            autoFocus
            onBlur={handleNameSubmit}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          />
        ) : (
          <button
            className="text-sm font-medium truncate max-w-[200px] hover:text-foreground/80 transition-colors"
            onClick={() => setEditing(true)}
          >
            {workflow.name}
          </button>
        )}
        <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0 h-4 capitalize">
          {workflow.status}
        </Badge>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-0.5">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} aria-label="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} aria-label="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings} aria-label="Workflow settings">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggle} aria-label="Toggle theme">
          {isDark() ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 ml-1" onClick={runWorkflow}>
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
      </div>
    </header>
  );
}
