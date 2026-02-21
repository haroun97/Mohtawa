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
  lastCompletedRunLog?: RunLog | null;
  lastRunLog?: RunLog | null;
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
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting_review';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  reviewSessionId?: string;
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

/** Ensure every node has a unique id; reassign duplicates and update edges. */
function ensureUniqueNodeIds(nodes: WorkflowNode[], edges: WorkflowEdge[]): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const seen = new Set<string>();
  /** For each duplicated id, list of ids to use when rewriting edges (first = original, rest = new ids for duplicates). */
  const remap = new Map<string, string[]>();
  const newNodes: WorkflowNode[] = nodes.map((n, i) => {
    if (seen.has(n.id)) {
      const newId = `node-${Date.now()}-${i}`;
      remap.get(n.id)!.push(newId);
      seen.add(newId);
      return { ...n, id: newId };
    }
    seen.add(n.id);
    remap.set(n.id, [n.id]);
    return { ...n, id: n.id };
  });
  if (remap.size === 0) return { nodes: newNodes, edges };
  const newEdges: WorkflowEdge[] = edges.map(e => {
    const srcList = remap.get(e.source);
    const tgtList = remap.get(e.target);
    return {
      ...e,
      source: srcList?.shift() ?? e.source,
      target: tgtList?.shift() ?? e.target,
    };
  });
  return { nodes: newNodes, edges: newEdges };
}

function apiToWorkflow(api: ApiWorkflow): Workflow {
  const nodes = hydrateNodes(api.nodes);
  const edges = hydrateEdges(api.edges);
  const { nodes: uniqueNodes, edges: uniqueEdges } = ensureUniqueNodeIds(nodes, edges);
  return {
    id: api.id,
    name: api.name,
    description: api.description || '',
    status: (api.status || 'draft').toLowerCase() as 'draft' | 'active' | 'archived',
    lastEdited: api.updatedAt,
    nodes: uniqueNodes,
    edges: uniqueEdges,
  };
}

function executionToRunLog(exec: ApiExecution): RunLog {
  const runStatus: RunStatus =
    exec.status === 'COMPLETED' ? 'success' :
    exec.status === 'FAILED' ? 'error' :
    exec.status === 'WAITING_FOR_REVIEW' ? 'waiting_review' :
    'running';
  const steps: RunStep[] = (exec.logs || []).map((log) => ({
    nodeId: log.nodeId,
    nodeTitle: log.nodeTitle,
    status: log.status as RunStatus,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    output: log.output,
    error: log.error,
  }));
  return {
    id: exec.id,
    workflowId: exec.workflowId,
    status: runStatus,
    startedAt: exec.startedAt,
    completedAt: exec.completedAt || undefined,
    steps,
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
  /** When latest run is in progress, steps from last completed run for Download/status fallback. */
  lastCompletedRunLog: RunLog | null;
  /** Node currently being run via Test node (shows spinner on that node). */
  testingNodeId: string | null;
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
  runSingleNode: (nodeId: string) => Promise<void>;
  rerunFromNode: (nodeId: string) => void;
  resolveReview: (workflowId: string, executionId: string, stepId: string, action: 'approve' | 'edit', approvedEdl?: unknown) => Promise<unknown>;

  getActiveWorkflow: () => Workflow | undefined;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  activeWorkflowId: null,
  selectedNodeId: null,
  runLog: null,
  lastCompletedRunLog: null,
  testingNodeId: null,
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
          lastCompletedRunLog: null,
          isLoading: false,
          saveStatus: 'saved',
          history: [{ nodes: wf.nodes, edges: wf.edges }],
          historyIndex: 0,
        };
      });
      // Restore run log and node status: use latest run when it is waiting for review or running (so
      // Review draft / Approve use the correct execution id); otherwise use last completed/failed.
      // When latest is in progress, use hybrid node status (idle steps get status from last completed)
      // and set lastCompletedRunLog so Download video can use it. If no completed run is in the list,
      // use workflow's persisted lastCompletedRunLog (saved when a run completed).
      try {
        const executions = await api.get<ApiExecution[]>(`/workflows/${id}/executions`);
        const latest = executions?.[0];
        const isInProgress = latest && (latest.status === 'WAITING_FOR_REVIEW' || latest.status === 'RUNNING');
        const finished = executions?.find((e: ApiExecution) => e.status === 'COMPLETED' || e.status === 'FAILED');
        const execToRestore = isInProgress ? latest : (finished ?? latest);
        const workflowLastCompleted = data?.lastCompletedRunLog ?? null;

        // When latest is in progress (e.g. WAITING_FOR_REVIEW), always restore runLog from the
        // latest execution so the Review node keeps its step output (draftVideoUrl, projectId)
        // and the video + Edit draft remain visible after reload. Use lastCompletedRunLog for
        // Render Final / Download fallback when needed.
        if (execToRestore) {
          const runLog = executionToRunLog(execToRestore);
          const lastCompletedRunLog =
            isInProgress
              ? (finished ? executionToRunLog(finished) : workflowLastCompleted)
              : null;
          set(state => ({
            ...state,
            runLog,
            lastCompletedRunLog,
            workflows: state.workflows.map(w =>
              w.id === id
                ? {
                    ...w,
                    nodes: w.nodes.map(n => {
                      if (isInProgress) {
                        const stepLatest = latest?.logs?.find((l: ApiStepLog) => l.nodeId === n.id);
                        const stepFinished = finished
                          ? finished.logs?.find((l: ApiStepLog) => l.nodeId === n.id)
                          : lastCompletedRunLog?.steps?.find((s) => s.nodeId === n.id);
                        const status =
                          stepLatest && stepLatest.status !== 'idle'
                            ? (stepLatest.status as RunStatus)
                            : (stepFinished?.status as RunStatus) ?? (stepLatest?.status as RunStatus);
                        if (stepLatest || stepFinished) {
                          return { ...n, data: { ...n.data, status: status ?? n.data.status } };
                        }
                      } else {
                        const stepLog = execToRestore.logs?.find((l: ApiStepLog) => l.nodeId === n.id);
                        if (stepLog) {
                          return { ...n, data: { ...n.data, status: stepLog.status as RunStatus } };
                        }
                      }
                      return n;
                    }),
                  }
                : w
            ),
          }));
        } else if (workflowLastCompleted) {
          set(state => ({
            ...state,
            runLog: workflowLastCompleted,
            lastCompletedRunLog: workflowLastCompleted,
            workflows: state.workflows.map(w =>
              w.id === id
                ? {
                    ...w,
                    nodes: w.nodes.map(n => {
                      const stepLog = (workflowLastCompleted as RunLog).steps.find((s) => s.nodeId === n.id);
                      if (stepLog) {
                        return { ...n, data: { ...n.data, status: stepLog.status } };
                      }
                      return n;
                    }),
                  }
                : w
            ),
          }));
        } else if (data?.lastRunLog) {
          // No executions (or empty list): restore from workflow's lastRunLog so Review node video etc. persist after reload
          const runLog = data.lastRunLog;
          const lastCompletedRunLog = data.lastCompletedRunLog ?? data.lastRunLog;
          set(state => ({
            ...state,
            runLog,
            lastCompletedRunLog,
            workflows: state.workflows.map(w =>
              w.id === id
                ? {
                    ...w,
                    nodes: w.nodes.map(n => {
                      const stepLog = runLog.steps?.find((s) => s.nodeId === n.id);
                      if (stepLog) {
                        return { ...n, data: { ...n.data, status: stepLog.status as RunStatus } };
                      }
                      return n;
                    }),
                  }
                : w
            ),
          }));
        }
      } catch (_) {
        // Executions fetch failed: restore from workflow's lastRunLog so Review node video persists after reload
        const runLog = data?.lastRunLog ?? null;
        const lastCompletedRunLog = data?.lastCompletedRunLog ?? data?.lastRunLog ?? null;
        if (runLog || lastCompletedRunLog) {
          const logForStatus = runLog ?? lastCompletedRunLog;
          set(state => ({
            ...state,
            runLog,
            lastCompletedRunLog,
            workflows: state.workflows.map(w =>
              w.id === id && logForStatus
                ? {
                    ...w,
                    nodes: w.nodes.map(n => {
                      const stepLog = logForStatus.steps?.find((s) => s.nodeId === n.id);
                      if (stepLog) {
                        return { ...n, data: { ...n.data, status: stepLog.status as RunStatus } };
                      }
                      return n;
                    }),
                  }
                : w
            ),
          }));
        }
      }

      // Ensure Preview Output and all nodes keep step output after reload: if we still have no run
      // state but the workflow has run log data, restore from it (covers any missed branch or race).
      const state = get();
      if (state.activeWorkflowId === id && !state.runLog && (data?.lastCompletedRunLog ?? data?.lastRunLog)) {
        const runLog = data.lastRunLog ?? data.lastCompletedRunLog ?? null;
        const lastCompletedRunLog = data.lastCompletedRunLog ?? data.lastRunLog ?? null;
        if (runLog) {
          set(s => ({
            ...s,
            runLog,
            lastCompletedRunLog,
            workflows: s.workflows.map(w =>
              w.id === id
                ? {
                    ...w,
                    nodes: w.nodes.map(n => {
                      const stepLog = runLog.steps?.find((step) => step.nodeId === n.id);
                      if (stepLog) {
                        return { ...n, data: { ...n.data, status: stepLog.status as RunStatus } };
                      }
                      return n;
                    }),
                  }
                : w
            ),
          }));
        }
      }
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
      lastCompletedRunLog: null,
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

    set({ runLog, lastCompletedRunLog: null, inspectorTab: 'logs' });

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
          lastCompletedRunLog: null,
          executionPollingId: exec.id,
        }));

        // Start polling for execution status
        const pollExecution = async () => {
          const { executionPollingId, activeWorkflowId } = get();
          if (!executionPollingId) return;

          try {
            const result = await api.get<ApiExecution>(`/workflows/${wf.id}/executions/${executionPollingId}`);

            const updatedSteps: RunStep[] = result.logs.map((log: ApiStepLog) => ({
              nodeId: log.nodeId,
              nodeTitle: log.nodeTitle,
              status: log.status as RunStatus,
              startedAt: log.startedAt,
              completedAt: log.completedAt,
              output: log.output,
              error: log.error,
              reviewSessionId: log.reviewSessionId,
            }));

            const runStatus: RunStatus =
              result.status === 'COMPLETED' ? 'success' :
              result.status === 'FAILED' ? 'error' :
              result.status === 'WAITING_FOR_REVIEW' ? 'waiting_review' :
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
              lastCompletedRunLog: null,
              workflows: state.workflows.map(w =>
                w.id === activeWorkflowId
                  ? {
                      ...w,
                      nodes: w.nodes.map(n => {
                        const stepLog = result.logs.find(l => l.nodeId === n.id);
                        if (stepLog) {
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
          lastCompletedRunLog: null,
        }));
      }
    };

    doExecute();
  },

  runSingleNode: async (nodeId: string) => {
    const wf = get().getActiveWorkflow();
    if (!wf) return;
    const { runLog } = get();
    set({ testingNodeId: nodeId });
    try {
      await get().saveWorkflowToApi();
      const priorExecutionId = runLog?.id ?? undefined;
      const result = await api.post<{ stepLog: ApiStepLog }>(
        `/workflows/${wf.id}/execute-node`,
        { nodeId, priorExecutionId },
      );
      const step = result.stepLog;
      const newStep: RunStep = {
        nodeId: step.nodeId,
        nodeTitle: step.nodeTitle,
        status: step.status as RunStatus,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        output: step.output,
        error: step.error,
        reviewSessionId: step.reviewSessionId,
      };
      set(state => {
        const existingSteps = state.runLog?.steps ?? [];
        const merged = existingSteps.some(s => s.nodeId === nodeId)
          ? existingSteps.map(s => s.nodeId === nodeId ? newStep : s)
          : [...existingSteps, newStep];
        const runStatus: RunStatus =
          step.status === 'error' ? 'error' :
          step.status === 'waiting_review' ? 'waiting_review' : 'success';
        return {
          runLog: {
            id: state.runLog?.id ?? 'test-single',
            workflowId: wf.id,
            status: runStatus,
            startedAt: state.runLog?.startedAt ?? step.startedAt ?? new Date().toISOString(),
            completedAt: step.completedAt ?? state.runLog?.completedAt,
            steps: merged,
          },
          lastCompletedRunLog: null,
          inspectorTab: 'logs',
          workflows: state.workflows.map(w =>
            w.id === wf.id
              ? {
                  ...w,
                  nodes: w.nodes.map(n =>
                    n.id === nodeId ? { ...n, data: { ...n.data, status: step.status as RunStatus } } : n
                  ),
                }
              : w
          ),
        };
      });
    } catch (err) {
      console.error('Test node failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Test node failed';
      set(state => {
        const newStep: RunStep = {
          nodeId,
          nodeTitle: state.workflows.flatMap(w => w.nodes).find(n => n.id === nodeId)?.data?.definition?.title ?? 'Node',
          status: 'error',
          error: errorMessage,
        };
        const existingSteps = state.runLog?.steps ?? [];
        const merged = existingSteps.some(s => s.nodeId === nodeId)
          ? existingSteps.map(s => s.nodeId === nodeId ? newStep : s)
          : [...existingSteps, newStep];
        return {
          runLog: {
            id: state.runLog?.id ?? 'test-single',
            workflowId: wf.id,
            status: 'error' as RunStatus,
            startedAt: state.runLog?.startedAt ?? new Date().toISOString(),
            steps: merged,
          },
          lastCompletedRunLog: null,
          inspectorTab: 'logs',
          workflows: state.workflows.map(w =>
            w.id === wf.id
              ? { ...w, nodes: w.nodes.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, status: 'error' as RunStatus } } : n)) }
              : w
          ),
        };
      });
    } finally {
      set({ testingNodeId: null });
    }
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

  resolveReview: async (workflowId: string, executionId: string, stepId: string, action: 'approve' | 'edit', approvedEdl?: unknown) => {
    const exec = await api.post<ApiExecution>(
      `/workflows/${workflowId}/executions/${executionId}/steps/${stepId}/resolve-review`,
      { action, approvedEdl },
    );
    const steps: RunStep[] = (exec.logs || []).map((log: ApiStepLog) => ({
      nodeId: log.nodeId,
      nodeTitle: log.nodeTitle,
      status: log.status as RunStatus,
      startedAt: log.startedAt,
      completedAt: log.completedAt,
      output: log.output,
      error: log.error,
      reviewSessionId: log.reviewSessionId,
    }));
    const runStatus: RunStatus =
      exec.status === 'COMPLETED' ? 'success' :
      exec.status === 'FAILED' ? 'error' :
      exec.status === 'WAITING_FOR_REVIEW' ? 'waiting_review' :
      'running';
    set({
      runLog: {
        id: exec.id,
        workflowId: exec.workflowId,
        status: runStatus,
        startedAt: exec.startedAt,
        completedAt: exec.completedAt || undefined,
        steps,
      },
      lastCompletedRunLog: null,
    });
    return exec;
  },

  getActiveWorkflow: () => {
    const { workflows, activeWorkflowId } = get();
    return workflows.find(w => w.id === activeWorkflowId);
  },
}));
