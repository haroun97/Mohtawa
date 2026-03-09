export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootTabParamList = {
  Projects: undefined;
  Runs: undefined;
  ReviewQueue: { runId?: string } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  WorkflowDetail: { workflowId: string };
  RunDetail: { runId: string; workflowId?: string; workflowName?: string };
  EdlEditor: { projectId: string };
  VoiceProfiles: undefined;
  IdeasEditor: undefined;
  IterationDetail: {
    runId: string;
    iterationId: string;
    title?: string;
    draftVideoUrl?: string | null;
    finalVideoUrl?: string | null;
    projectId?: string | null;
  };
  ImportFootage: undefined;
  BuilderCanvas: { workflowId: string };
};
