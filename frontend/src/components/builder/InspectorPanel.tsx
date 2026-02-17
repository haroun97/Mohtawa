import { useWorkflowStore } from '@/store/workflowStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NodeConfigForm } from './NodeConfigForm';
import { RunLogs } from './RunLogs';
import { X, Settings2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InspectorPanel() {
  const { selectedNodeId, getActiveWorkflow, inspectorTab, setInspectorTab, selectNode, runLog } = useWorkflowStore();
  const workflow = getActiveWorkflow();
  const selectedNode = workflow?.nodes.find(n => n.id === selectedNodeId);
  const showPanel = !!selectedNode || !!runLog;

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
              {selectedNode && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => selectNode(null)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <TabsContent value="config" className="flex-1 overflow-y-auto p-0 m-0">
              {selectedNode ? (
                <NodeConfigForm node={selectedNode} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Select a node to configure
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="flex-1 overflow-y-auto p-0 m-0">
              <RunLogs />
            </TabsContent>
          </Tabs>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
