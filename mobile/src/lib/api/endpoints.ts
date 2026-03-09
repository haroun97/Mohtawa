/**
 * API endpoint helpers — mirror frontend paths and response types.
 * Uses apiClient from lib/api; types from @mohtawa/shared.
 */
import type {
  WorkflowListItem,
  ExecutionListItem,
  ReviewQueueResponse,
  ReviewDecideBody,
} from '@mohtawa/shared';
import { apiClient, apiFormData, apiFormDataWithProgress } from '../api';

/** Workflows (projects) — same as frontend */
export const workflowsApi = {
  list: () => apiClient.get<WorkflowListItem[]>('/workflows'),
  get: (id: string) => apiClient.get<WorkflowListItem>(`/workflows/${id}`),
  create: (name?: string) =>
    apiClient.post<WorkflowListItem>('/workflows', { name: name || 'Untitled Workflow' }),
  duplicate: (id: string) =>
    apiClient.post<WorkflowListItem>(`/workflows/${id}/duplicate`, {}),
  delete: (id: string) => apiClient.delete<unknown>(`/workflows/${id}`),
  update: (
    id: string,
    data: { name?: string; description?: string; status?: string; nodes?: unknown[]; edges?: unknown[] }
  ) => apiClient.put<WorkflowListItem>(`/workflows/${id}`, data),
  execute: (workflowId: string, body?: { ideaDoc?: unknown }) =>
    apiClient.post<ExecutionListItem>(`/workflows/${workflowId}/execute`, body ?? {}),
};

/** Media upload — same as frontend POST /api/media/upload (multipart). */
export interface MediaUploadResult {
  key: string;
  url: string;
}

export const mediaApi = {
  upload: (file: { uri: string; name?: string; type?: string }) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name ?? 'video.mp4',
      type: file.type ?? 'video/mp4',
    } as unknown as Blob);
    return apiFormData<MediaUploadResult>('/media/upload', formData);
  },
  /** Upload with progress callback and abort; totalBytes (e.g. asset.fileSize) improves accuracy. */
  uploadWithProgress: (
    file: { uri: string; name?: string; type?: string },
    options: { totalBytes?: number; onProgress?: (percent: number) => void } = {}
  ) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name ?? 'video.mp4',
      type: file.type ?? 'video/mp4',
    } as unknown as Blob);
    return apiFormDataWithProgress<MediaUploadResult>('/media/upload', formData, {
      totalBytes: options.totalBytes,
      onProgress: options.onProgress,
    });
  },
};

/** Presigned play URL for S3/storage keys (same as frontend GET /api/storage/play) */
export const storageApi = {
  playUrl: (key: string) =>
    apiClient.get<{ url: string }>(`/storage/play`, { params: { key } }),
};

/** Step log from execution (matches backend StepLog). */
export interface ExecutionStepLog {
  nodeId: string;
  nodeType: string;
  nodeTitle: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  reviewSessionId?: string;
  iterationSteps?: Array<{
    iteration: number;
    itemTitle?: string;
    steps: Array<{ nodeId: string; nodeTitle: string; status: string; output?: Record<string, unknown>; error?: string }>;
  }>;
}

/** Single execution detail (GET /api/workflows/:id/executions/:execId). */
export interface ExecutionDetail {
  id: string;
  workflowId: string;
  status: string;
  logs: ExecutionStepLog[];
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

/** Executions (runs) for a workflow — same as frontend GET /api/workflows/:id/executions */
export const executionsApi = {
  list: (workflowId: string) =>
    apiClient.get<ExecutionListItem[]>(`/workflows/${workflowId}/executions`),
  get: (workflowId: string, execId: string) =>
    apiClient.get<ExecutionDetail>(`/workflows/${workflowId}/executions/${execId}`),
};

/** Video project list item (from GET /api/projects). */
export interface VideoProjectListItem {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Projects / EDL — same as frontend */
export const projectsApi = {
  list: () => apiClient.get<VideoProjectListItem[]>('/projects'),
  get: (projectId: string) =>
    apiClient.get<{ id: string; draftVideoUrl: string | null; edlUrl: string; status: string }>(
      `/projects/${projectId}`
    ),
  getEdl: (projectId: string) =>
    apiClient.get<Record<string, unknown>>(`/projects/${projectId}/edl`),
  updateEdl: (projectId: string, edl: Record<string, unknown>) =>
    apiClient.post<{ edlUrl: string }>(`/projects/${projectId}/edl/update`, edl),
  getExportPreview: (projectId: string) =>
    apiClient.get<{ progress: number; previewImageUrl?: string }>(
      `/projects/${projectId}/export-preview`
    ),
  renderDraft: (projectId: string) =>
    apiClient.post<{ status: string; jobId?: string; draftVideoUrl?: string; message?: string }>(
      `/projects/${projectId}/render-draft`
    ),
};

/** Render status — same as frontend */
export const rendersApi = {
  getStatus: (jobId: string) =>
    apiClient.get<{ status: 'rendering' | 'done' | 'failed'; progress: number; outputVideoUrl?: string }>(
      `/renders/${jobId}/status`
    ),
};

/** Settings / API keys — same as frontend */
export interface ApiKeyEntry {
  id: string;
  service: string;
  label: string | null;
  maskedKey: string;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  listKeys: () => apiClient.get<ApiKeyEntry[]>('/settings/keys'),
  addKey: (data: { service: string; key: string; label?: string }) =>
    apiClient.post<ApiKeyEntry>('/settings/keys', data),
  deleteKey: (id: string) => apiClient.delete<unknown>(`/settings/keys/${id}`),
};

/** Idea docs (Ideas & Scripts) — same as frontend */
export interface IdeaDocListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdeaDocFull {
  id: string;
  userId: string;
  title: string;
  content: object;
  createdAt: string;
  updatedAt: string;
}

export const ideaDocsApi = {
  list: (trash = false) =>
    apiClient.get<IdeaDocListItem[]>(`/idea-docs${trash ? '?trash=1' : ''}`),
  get: (id: string) => apiClient.get<IdeaDocFull>(`/idea-docs/${id}`),
  create: (title?: string) =>
    apiClient.post<IdeaDocFull>('/idea-docs', title ? { title } : {}),
  update: (id: string, data: { title?: string; content?: object }) =>
    apiClient.put<IdeaDocFull>(`/idea-docs/${id}`, data),
  delete: (id: string, permanent = false) =>
    apiClient.delete<{ deleted: boolean; permanent: boolean }>(
      `/idea-docs/${id}${permanent ? '?permanent=1' : ''}`
    ),
  restore: (id: string) => apiClient.post<IdeaDocFull>(`/idea-docs/${id}/restore`, {}),
};

/** Voice profiles — same as frontend */
export interface VoiceProfile {
  id: string;
  userId: string;
  provider: string;
  providerVoiceId: string;
  name: string;
  language: string | null;
  trainingStatus: string | null;
  assetCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceProfileAsset {
  id: string;
  durationSec?: number;
  createdAt: string;
}

export const voiceProfilesApi = {
  list: () => apiClient.get<VoiceProfile[]>('/voice-profiles'),
  get: (id: string) => apiClient.get<VoiceProfile>(`/voice-profiles/${id}`),
  create: (data: { name: string; provider: string; providerVoiceId?: string; language?: string }) =>
    apiClient.post<VoiceProfile>('/voice-profiles', data),
  uploadAssets: (
    profileId: string,
    file: { uri: string; name?: string; type?: string },
    durationSec?: number
  ) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name ?? 'audio.mp3',
      type: file.type ?? 'audio/mpeg',
    } as unknown as Blob);
    if (durationSec != null && Number.isFinite(durationSec)) {
      formData.append('durationSec', String(durationSec));
    }
    return apiFormData<VoiceProfileAsset>(
      `/voice-profiles/${profileId}/assets`,
      formData
    );
  },
  train: (profileId: string) =>
    apiClient.post<{ id: string; trainingStatus: string; message: string }>(
      `/voice-profiles/${profileId}/train`,
      {}
    ),
};

/** Review queue — same as frontend runsApi */
export const runsApi = {
  getReviewQueue: (runId: string) =>
    apiClient.get<ReviewQueueResponse>(`/runs/${runId}/review-queue`),
  decideReview: (
    runId: string,
    iterationId: string,
    body: ReviewDecideBody
  ) =>
    apiClient.post<unknown>(
      `/runs/${runId}/iterations/${iterationId}/review/decide`,
      body
    ),
  regenerateDraft: (runId: string, iterationId: string) =>
    apiClient.post<unknown>(
      `/runs/${runId}/iterations/${iterationId}/regenerate-draft`
    ),
};
