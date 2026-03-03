export type NodeCategory = 'trigger' | 'ai' | 'voice' | 'video' | 'social' | 'logic' | 'utility' | 'review' | 'ideas' | 'text' | 'script';

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  title: string;
  description: string;
  icon: string;
  inputs: string[];
  outputs: string[];
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'toggle';
  options?: string[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  help?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    definition: NodeDefinition;
    config: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error' | 'disabled' | 'waiting_review';
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  lastEdited: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export type RunStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting_review';

/** Step log for a single node inside a For Each iteration */
export interface IterationStepLog {
  nodeId: string;
  nodeTitle: string;
  status: string;
  output?: Record<string, unknown>;
  error?: string;
}

export interface RunStep {
  nodeId: string;
  nodeTitle: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  reviewSessionId?: string;
  /** When this step is For Each: one entry per iteration with child step logs */
  iterationSteps?: Array<{
    iteration: number;
    itemTitle?: string;
    steps: IterationStepLog[];
  }>;
}

export interface RunLog {
  id: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
}
