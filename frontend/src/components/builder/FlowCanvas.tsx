import { useCallback, useRef, DragEvent, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  BackgroundVariant,
  Node,
  Edge,
  useReactFlow,
  ReactFlowProvider,
  NodeMouseHandler,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';
import { useWorkflowStore } from '@/store/workflowStore';
import { nodeDefinitions } from '@/store/nodeDefinitions';
import { WorkflowNodeComponent } from './WorkflowNode';
import { WorkflowNode } from '@/types/workflow';

const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

function FlowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const activeWorkflowId = useWorkflowStore(s => s.activeWorkflowId);
  const workflows = useWorkflowStore(s => s.workflows);
  const selectedNodeId = useWorkflowStore(s => s.selectedNodeId);
  const selectNode = useWorkflowStore(s => s.selectNode);
  const addNodeAction = useWorkflowStore(s => s.addNode);
  const addEdgeAction = useWorkflowStore(s => s.addEdge);
  const updateNodePosition = useWorkflowStore(s => s.updateNodePosition);
  const removeNode = useWorkflowStore(s => s.removeNode);
  const removeEdge = useWorkflowStore(s => s.removeEdge);

  const workflow = workflows.find(w => w.id === activeWorkflowId);

  const rfNodes: Node[] = useMemo(() => (workflow?.nodes || []).map(n => ({
    id: n.id,
    type: 'workflowNode',
    position: n.position,
    data: { ...n.data, isSelected: n.id === selectedNodeId },
  })), [workflow?.nodes, selectedNodeId]);

  const rfEdges: Edge[] = useMemo(() => (workflow?.edges || []).map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: true,
    style: { strokeWidth: 2 },
  })), [workflow?.edges]);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;

    const existingEdge = workflow?.edges.find(
      e => e.source === connection.source && e.target === connection.target
    );
    if (existingEdge) return false;

    const wouldCreateCycle = (sourceId: string, targetId: string): boolean => {
      if (sourceId === targetId) return true;
      const outgoing = workflow?.edges.filter(e => e.source === targetId) || [];
      return outgoing.some(e => wouldCreateCycle(sourceId, e.target));
    };
    if (wouldCreateCycle(connection.source, connection.target)) return false;

    return true;
  }, [workflow?.edges]);

  const onConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && isValidConnection(connection)) {
      addEdgeAction({
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || undefined,
        targetHandle: connection.targetHandle || undefined,
      });
    }
  }, [addEdgeAction, isValidConnection]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        updateNodePosition(change.id, change.position);
      }
      if (change.type === 'remove') {
        removeNode(change.id);
      }
    }
  }, [updateNodePosition, removeNode]);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === 'remove') {
        removeEdge(change.id);
      }
    }
  }, [removeEdge]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const definition = nodeDefinitions.find(nd => nd.type === type);
    if (!definition) return;

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: definition.type,
      position,
      data: {
        definition,
        config: definition.fields.reduce((acc, f) => {
          if (f.defaultValue !== undefined) acc[f.name] = f.defaultValue;
          return acc;
        }, {} as Record<string, any>),
      },
    };

    addNodeAction(newNode);
  }, [screenToFlowPosition, addNodeAction]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={['Delete', 'Backspace']}
        className="canvas-bg"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="opacity-40" />
        <Controls className="rounded-lg" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
