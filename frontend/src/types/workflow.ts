import type {
  NodeCategory as SharedNodeCategory,
  RunStatus as SharedRunStatus,
  RunStep as SharedRunStep,
  RunLog as SharedRunLog,
  IterationStepLog as SharedIterationStepLog,
} from "@mohtawa/shared";

export type NodeCategory = SharedNodeCategory;
export type RunStatus = SharedRunStatus;
export type RunStep = SharedRunStep;
export type RunLog = SharedRunLog;
export type IterationStepLog = SharedIterationStepLog;

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

