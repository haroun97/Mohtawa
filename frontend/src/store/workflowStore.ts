import { create } from 'zustand';
import { Workflow, WorkflowNode, WorkflowEdge, RunLog, RunStep, RunStatus } from '@/types/workflow';
import { nodeDefinitions } from './nodeDefinitions';
import { api } from '@/lib/api';

interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface ApiWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  nodes: unknown[];
  edges: unknown[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiExecution {
  id: string;
  workflowId: string;
  status: string;
  logs: ApiStepLog[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ApiStepLog {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  status: 'idle' | 'running' | 'success' | 'error';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

function findDef(type: string) {
  return nodeDefinitions.find(nd => nd.type === type);
}

function hydrateNodes(raw: unknown[]): WorkflowNode[] {
  return (raw || []).map((n: any) => {
    const def = findDef(n.type) || findDef(n.data?.definition?.type);
    return {
      id: n.id,
      type: n.type,
      position: n.position || { x: 0, y: 0 },
      data: {
        definition: def || n.data?.definition || { type: n.type, category: 'utility', title: n.type, description: '', icon: 'Box', inputs: ['input'], outputs: ['output'], fields: [] },
        config: n.data?.config || {},
        status: n.data?.status,
      },
    };
  });
}

function hydrateEdges(raw: unknown[]): WorkflowEdge[] {
  return (raw || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
  }));
}

function apiToWorkflow(api: ApiWorkflow): Workflow {
  return {
    id: api.id,
    name: api.name,
    description: api.description || '',
    status: (api.status || 'draft').toLowerCase() as 'draft' | 'active' | 'archived',
    lastEdited: api.updatedAt,
    nodes: hydrateNodes(api.nodes),
    edges: hydrateEdges(api.edges),
  };
}

function serializeNodes(nodes: WorkflowNode[]) {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      definition: {
        type: n.data.definition.type,
        category: n.data.definition.category,
        title: n.data.definition.title,
        description: n.data.definition.description,
        icon: n.data.definition.icon,
        inputs: n.data.definition.inputs,
        outputs: n.data.definition.outputs,
        fields: n.data.definition.fields,
      },
      config: n.data.config,
      status: n.data.status,
    },
  }));
}

interface WorkflowState {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  selectedNodeId: string | null;
  runLog: RunLog | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  inspectorTab: 'config' | 'logs';
  isLoading: boolean;
  executionPollingId: string | null;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // API actions
  fetchWorkflows: () => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflowApi: (name?: string) => Promise<string>;
  deleteWorkflowApi: (id: string) => Promise<void>;
  duplicateWorkflowApi: (id: string) => Promise<Workflow>;
  saveWorkflowToApi: () => Promise<void>;

  // Local state actions
  setActiveWorkflow: (id: string) => void;
  selectNode: (id: string | null) => void;
  setInspectorTab: (tab: 'config' | 'logs') => void;

  addNode: (node: WorkflowNode) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  toggleNodeDisabled: (nodeId: string) => void;

  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;

  updateWorkflowName: (name: string) => void;
  updateWorkflowMeta: (meta: { name?: string; description?: string; status?: 'draft' | 'active' | 'archived' }) => void;

  triggerSave: () => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  runWorkflow: () => void;
  rerunFromNode: (nodeId: string) => void;

  getActiveWorkflow: () => Workflow | undefined;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  selectedNodeId: null,
  runLog: null,
  saveStatus: 'saved',
  inspectorTab: 'config',
  isLoading: false,
  executionPollingId: null,
  history: [],
  historyIndex: -1,

  // ─── API Actions ────────────────────────────────────

  fetchWorkflows: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<ApiWorkflow[]>('/workflows');
      set({ workflows: data.map(apiToWorkflow), isLoading: false });
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      set({ isLoading: false });
    }
  },

  fetchWorkflow: async (id: string) => {
    set({ isLoading: true });
    try {
      const data = await api.get<ApiWorkflow>(`/workflows/${id}`);
      const wf = apiToWorkflow(data);
      set(state => {
        const exists = state.workflows.some(w => w.id === id);
        const workflows = exists
          ? state.workflows.map(w => w.id === id ? wf : w)
          : [...state.workflows, wf];
        return {
          workflows,
          activeWorkflowId: id,
          selectedNodeId: null,
          runLog: null,
          isLoading: false,
          saveStatus: 'saved',
          history: [{ nodes: wf.nodes, edges: wf.edges }],
          historyIndex: 0,
        };
      });
    } catch (err) {
      console.error('Failed to fetch workflow:', err);
      set({ isLoading: false });
    }
  },

  createWorkflowApi: async (name?: string) => {
    const data = await api.post<ApiWorkflow>('/workflows', {
      name: name || 'Untitled Workflow',
    });
    const wf = apiToWorkflow(data);
    set(state => ({ workflows: [wf, ...state.workflows] }));
    return wf.id;
  },

  deleteWorkflowApi: async (id: string) => {
    await api.delete(`/workflows/${id}`);
    set(state => ({
      workflows: state.workflows.filter(w => w.id !== id),
      activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId,
    }));
  },

  duplicateWorkflowApi: async (id: string) => {
    const data = await api.post<ApiWorkflow>(`/workflows/${id}/duplicate`, {});
    const wf = apiToWorkflow(data);
    set(state => ({ workflows: [wf, ...state.workflows] }));
    return wf;
  },

  saveWorkflowToApi: async () => {
    const { activeWorkflowId, workflows } = get();
    const wf = workflows.find(w => w.id === activeWorkflowId);
    if (!wf) return;

    set({ saveStatus: 'saving' });
    try {
      await api.put(`/workflows/${wf.id}`, {
        name: wf.name,
        description: wf.description,
        status: wf.status.toUpperCase(),
        nodes: serializeNodes(wf.nodes),
        edges: wf.edges,
      });
      set({ saveStatus: 'saved' });
    } catch (err) {
      console.error('Failed to save workflow:', err);
      set({ saveStatus: 'unsaved' });
    }
  },

  // ─── Local State Actions ─────────────────────────────

  setActiveWorkflow: (id) => {
    const wf = get().workflows.find(w => w.id === id);
    set({
      activeWorkflowId: id,
      selectedNodeId: null,
      runLog: null,
      history: wf ? [{ nodes: wf.nodes, edges: wf.edges }] : [],
      historyIndex: 0,
    });
  },

  selectNode: (id) => set({ selectedNodeId: id, inspectorTab: 'config' }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  pushHistory: () => {
    const { activeWorkflowId, workflows, history, historyIndex } = get();
    const wf = workflows.find(w => w.id === activeWorkflowId);
    if (!wf) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: JSON.parse(JSON.stringify(wf.nodes)), edges: JSON.parse(JSON.stringify(wf.edges)) });
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addNode: (node) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, nodes: [...w.nodes, node], lastEdited: new Date().toISOString() } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().pushHistory();
    get().triggerSave();
  },

  updateNodeConfig: (nodeId, config) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId
          ? { ...w, nodes: w.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n), lastEdited: new Date().toISOString() }
          : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  updateNodePosition: (nodeId, position) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId
          ? { ...w, nodes: w.nodes.map(n => n.id === nodeId ? { ...n, position } : n) }
          : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  removeNode: (nodeId) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId
          ? {
              ...w,
              nodes: w.nodes.filter(n => n.id !== nodeId),
              edges: w.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
              lastEdited: new Date().toISOString(),
            }
          : w
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      saveStatus: 'unsaved',
    }));
    get().pushHistory();
    get().triggerSave();
  },

  duplicateNode: (nodeId) => {
    const wf = get().getActiveWorkflow();
    const node = wf?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const newNode: WorkflowNode = {
      ...JSON.parse(JSON.stringify(node)),
      id: `node-${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
    };
    get().addNode(newNode);
  },

  toggleNodeDisabled: (nodeId) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId
          ? {
              ...w,
              nodes: w.nodes.map(n =>
                n.id === nodeId
                  ? { ...n, data: { ...n.data, status: n.data.status === 'disabled' ? 'idle' : 'disabled' } }
                  : n
              ),
            }
          : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  addEdge: (edge) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, edges: [...w.edges, edge], lastEdited: new Date().toISOString() } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().pushHistory();
    get().triggerSave();
  },

  removeEdge: (edgeId) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, edges: w.edges.filter(e => e.id !== edgeId), lastEdited: new Date().toISOString() } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  updateWorkflowName: (name) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, name, lastEdited: new Date().toISOString() } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  updateWorkflowMeta: (meta) => {
    const { activeWorkflowId } = get();
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, ...meta, lastEdited: new Date().toISOString() } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  triggerSave: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      get().saveWorkflowToApi();
    }, 1500);
  },

  undo: () => {
    const { history, historyIndex, activeWorkflowId } = get();
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    set(state => ({
      historyIndex: historyIndex - 1,
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, nodes: JSON.parse(JSON.stringify(prev.nodes)), edges: JSON.parse(JSON.stringify(prev.edges)) } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  redo: () => {
    const { history, historyIndex, activeWorkflowId } = get();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    set(state => ({
      historyIndex: historyIndex + 1,
      workflows: state.workflows.map(w =>
        w.id === activeWorkflowId ? { ...w, nodes: JSON.parse(JSON.stringify(next.nodes)), edges: JSON.parse(JSON.stringify(next.edges)) } : w
      ),
      saveStatus: 'unsaved',
    }));
    get().triggerSave();
  },

  runWorkflow: () => {
    const wf = get().getActiveWorkflow();
    if (!wf) return;

    // Prepare initial run log for immediate UI feedback
    const steps: RunStep[] = wf.nodes
      .filter(n => n.data.status !== 'disabled')
      .map(n => ({
        nodeId: n.id,
        nodeTitle: n.data.definition.title,
        status: 'idle' as RunStatus,
      }));

    const runLog: RunLog = {
      id: `run-pending`,
      workflowId: wf.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps,
    };

    set({ runLog, inspectorTab: 'logs' });

    // Save first, then execute on backend
    const doExecute = async () => {
      try {
        await get().saveWorkflowToApi();
        const exec = await api.post<ApiExecution>(`/workflows/${wf.id}/execute`, {});

        set(state => ({
          runLog: state.runLog ? {
            ...state.runLog,
            id: exec.id,
          } : null,
          executionPollingId: exec.id,
        }));

        // Start polling for execution status
        const pollExecution = async () => {
          const { executionPollingId, activeWorkflowId } = get();
          if (!executionPollingId) return;

          try {
            const result = await api.get<ApiExecution>(`/workflows/${wf.id}/executions/${executionPollingId}`);

            const updatedSteps: RunStep[] = result.logs.map(log => ({
              nodeId: log.nodeId,
              nodeTitle: log.nodeTitle,
              status: log.status,
              startedAt: log.startedAt,
              completedAt: log.completedAt,
              output: log.output,
              error: log.error,
            }));

            const runStatus: RunStatus =
              result.status === 'COMPLETED' ? 'success' :
              result.status === 'FAILED' ? 'error' :
              'running';

            set(state => ({
              runLog: {
                id: result.id,
                workflowId: result.workflowId,
                status: runStatus,
                startedAt: result.startedAt,
                completedAt: result.completedAt || undefined,
                steps: updatedSteps,
              },
              workflows: state.workflows.map(w =>
                w.id === activeWorkflowId
                  ? {
                      ...w,
                      nodes: w.nodes.map(n => {
                        const stepLog = result.logs.find(l => l.nodeId === n.id);
                        if (stepLog && stepLog.status !== 'idle') {
                          return { ...n, data: { ...n.data, status: stepLog.status } };
                        }
                        return n;
                      }),
                    }
                  : w
              ),
            }));

            if (result.status === 'RUNNING') {
              pollTimer = setTimeout(pollExecution, 500);
            } else {
              set({ executionPollingId: null });
            }
          } catch (err) {
            console.error('Polling error:', err);
            set({ executionPollingId: null });
          }
        };

        pollTimer = setTimeout(pollExecution, 300);
      } catch (err) {
        console.error('Execution failed:', err);
        set(state => ({
          runLog: state.runLog ? { ...state.runLog, status: 'error' } : null,
        }));
      }
    };

    doExecute();
  },

  rerunFromNode: (_nodeId) => {
    const wf = get().getActiveWorkflow();
    if (!wf) return;
    set(state => ({
      workflows: state.workflows.map(w =>
        w.id === wf.id ? { ...w, nodes: w.nodes.map(n => ({ ...n, data: { ...n.data, status: n.data.status === 'disabled' ? 'disabled' : 'idle' } })) } : w
      ),
    }));
    get().runWorkflow();
  },

  getActiveWorkflow: () => {
    const { workflows, activeWorkflowId } = get();
    return workflows.find(w => w.id === activeWorkflowId);
  },
}));
