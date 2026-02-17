export type NodeCategory = 'trigger' | 'ai' | 'voice' | 'video' | 'social' | 'logic' | 'utility';

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
    status?: 'idle' | 'running' | 'success' | 'error' | 'disabled';
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

export type RunStatus = 'idle' | 'running' | 'success' | 'error';

export interface RunStep {
  nodeId: string;
  nodeTitle: string;
  status: RunStatus;
  startedAt?: string;
  completedAt?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface RunLog {
  id: string;
  workflowId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  steps: RunStep[];
}
