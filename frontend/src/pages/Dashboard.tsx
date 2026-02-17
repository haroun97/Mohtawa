import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Workflow, MoreHorizontal, Trash2, Copy, Sun, Moon, LogOut, User, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useTheme } from '@/hooks/useTheme';
import { Workflow as WorkflowType } from '@/types/workflow';

type Filter = 'all' | 'draft' | 'active';

export default function Dashboard() {
  const { workflows, fetchWorkflows, createWorkflowApi, deleteWorkflowApi, duplicateWorkflowApi, setActiveWorkflow, isLoading } = useWorkflowStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toggle, isDark } = useTheme();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const filtered = workflows.filter(w => {
    if (filter !== 'all' && w.status !== filter) return false;
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleNew = async () => {
    setCreating(true);
    try {
      const id = await createWorkflowApi();
      setActiveWorkflow(id);
      toast.success('Workflow created');
      navigate(`/builder/${id}`);
    } catch (err) {
      toast.error('Failed to create workflow', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (wf: WorkflowType) => {
    setActiveWorkflow(wf.id);
    navigate(`/builder/${wf.id}`);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteWorkflowApi(deleteTarget);
        toast.success('Workflow deleted');
      } catch (err) {
        toast.error('Failed to delete workflow', {
          description: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
      }
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = async (wfId: string) => {
    try {
      await duplicateWorkflowApi(wfId);
      toast.success('Workflow duplicated');
    } catch (err) {
      toast.error('Failed to duplicate workflow', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">Mohtawa</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="rounded-full" aria-label="Toggle theme">
              {isDark() ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm hidden sm:inline">{user?.name || user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Top section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground text-sm mt-1">Automate your AI content creation pipeline</p>
          </div>
          <Button onClick={handleNew} className="gap-2" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Workflow
          </Button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'draft', 'active'] as Filter[]).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && workflows.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Skeleton className="h-4 w-12 rounded-full" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Workflow grid */
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Workflow className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No workflows found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  {search ? 'Try a different search term.' : 'Create your first workflow to start automating content creation.'}
                </p>
                {!search && (
                  <Button onClick={handleNew} className="gap-2" disabled={creating}>
                    <Plus className="h-4 w-4" /> Create Workflow
                  </Button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((wf, i) => (
                  <motion.div
                    key={wf.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="workflow-card group"
                    onClick={() => handleOpen(wf)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{wf.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{wf.description || 'No description'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpen(wf); }}>
                            <Workflow className="h-4 w-4 mr-2" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); handleDuplicate(wf.id); }}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={e => { e.stopPropagation(); setDeleteTarget(wf.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                      <Badge variant={wf.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0">
                        {wf.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(wf.lastEdited)}</span>
                      <span className="text-[10px] text-muted-foreground">{wf.nodes.length} nodes</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workflow and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
