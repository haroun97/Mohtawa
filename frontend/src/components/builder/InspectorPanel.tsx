import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { NodeConfigForm } from './NodeConfigForm';
import { RunLogs } from './RunLogs';
import { X, Settings2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface InspectorPanelProps {
  onOpenEdlEditor?: (projectId: string) => void;
}

function InspectorPanelContent({
  onOpenEdlEditor,
  onClose,
}: {
  onOpenEdlEditor?: (projectId: string) => void;
  onClose?: () => void;
}) {
  const { selectedNodeId, getActiveWorkflow, inspectorTab, setInspectorTab, selectNode, runLog } = useWorkflowStore();
  const workflow = getActiveWorkflow();
  const selectedNode = workflow?.nodes.find(n => n.id === selectedNodeId);

  return (
    <Tabs value={inspectorTab} onValueChange={(v) => setInspectorTab(v as 'config' | 'logs')} className="flex flex-col h-full">
      <div className="flex items-center border-b px-3 h-10 shrink-0">
        <TabsList className="h-7 bg-transparent p-0 gap-1">
          <TabsTrigger value="config" className="text-xs h-7 px-2.5 data-[state=active]:bg-secondary gap-1.5">
            <Settings2 className="h-3 w-3" /> Config
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs h-7 px-2.5 data-[state=active]:bg-secondary gap-1.5">
            <Terminal className="h-3 w-3" /> Logs
          </TabsTrigger>
        </TabsList>
        <div className="flex-1" />
        {(selectedNode || onClose) && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { selectNode(null); onClose?.(); }}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <TabsContent value="config" className="flex-1 overflow-y-auto p-0 m-0">
        {selectedNode ? (
          <NodeConfigForm node={selectedNode} onOpenEdlEditor={onOpenEdlEditor} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground min-h-[120px]">
            Select a node to configure
          </div>
        )}
      </TabsContent>

      <TabsContent value="logs" className="flex-1 overflow-y-auto p-0 m-0">
        <RunLogs />
      </TabsContent>
    </Tabs>
  );
}

export function InspectorPanel({ onOpenEdlEditor }: InspectorPanelProps = {}) {
  const { selectedNodeId, getActiveWorkflow, inspectorTab, setInspectorTab, selectNode, runLog } = useWorkflowStore();
  const workflow = getActiveWorkflow();
  const selectedNode = workflow?.nodes.find(n => n.id === selectedNodeId);
  const showPanel = !!selectedNode || !!runLog;
  const isMobile = useIsMobile();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  // On mobile: only open the sheet when the user selects a node (not when only runLog is present).
  // This avoids the sheet auto-opening on workflow entry (which would hide the canvas) and ensures
  // the sheet re-opens when tapping a node after closing it.
  useEffect(() => {
    if (showPanel && selectedNodeId) setMobileSheetOpen(true);
  }, [showPanel, selectedNodeId]);

  if (isMobile) {
    const handleOpenEdlEditor = onOpenEdlEditor
      ? (projectId: string) => {
          setMobileSheetOpen(false);
          onOpenEdlEditor(projectId);
        }
      : undefined;
    return (
      <Sheet open={mobileSheetOpen} onOpenChange={(open) => { setMobileSheetOpen(open); if (!open) selectNode(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col" hideCloseButton>
          <VisuallyHidden.Root>
            <SheetTitle>Inspector</SheetTitle>
          </VisuallyHidden.Root>
          <InspectorPanelContent onOpenEdlEditor={handleOpenEdlEditor} onClose={() => setMobileSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AnimatePresence>
      {showPanel && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l bg-card/50 backdrop-blur-sm overflow-hidden shrink-0 flex flex-col"
        >
          <InspectorPanelContent onOpenEdlEditor={onOpenEdlEditor} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
