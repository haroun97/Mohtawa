/** API base URL. In dev, uses current host (so LAN IP works without editing .env when IP changes). */
function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE;
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001/api`;
  }
  return "http://localhost:3001/api";
}
const API_BASE = getApiBase();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("auth-storage");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, data.error || "Request failed", data.details);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "PUT", body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

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
    api.get<IdeaDocListItem[]>(`/idea-docs${trash ? "?trash=1" : ""}`),
  create: (title?: string) =>
    api.post<IdeaDocFull>("/idea-docs", title ? { title } : {}),
  get: (id: string) => api.get<IdeaDocFull>(`/idea-docs/${id}`),
  update: (id: string, data: { title?: string; content?: object }) =>
    api.put<IdeaDocFull>(`/idea-docs/${id}`, data),
  delete: (id: string, permanent = false) =>
    api.delete<{ deleted: boolean; permanent: boolean }>(
      `/idea-docs/${id}${permanent ? "?permanent=1" : ""}`
    ),
  restore: (id: string) => api.post<IdeaDocFull>(`/idea-docs/${id}/restore`, {}),
};

/** POST with multipart/form-data (e.g. file upload). No Content-Type header so browser sets boundary. */
async function postMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, data.error || "Request failed", data.details);
  }
  return res.json();
}

export interface VoiceProfile {
  id: string;
  userId: string;
  provider: string;
  providerVoiceId: string;
  name: string;
  language: string | null;
  trainingStatus: string | null;
  assetCount?: number;
  assets?: Array<{ id: string; fileUrl: string; durationSec: number | null; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export const voiceProfilesApi = {
  list: () => api.get<VoiceProfile[]>("/voice-profiles"),
  get: (id: string) => api.get<VoiceProfile>(`/voice-profiles/${id}`),
  create: (data: { name: string; provider: string; providerVoiceId?: string; language?: string }) =>
    api.post<VoiceProfile>("/voice-profiles", data),
  uploadAsset: (profileId: string, file: File, durationSec?: number) => {
    const form = new FormData();
    form.append("file", file);
    if (durationSec != null) form.append("durationSec", String(durationSec));
    return postMultipart<{ id: string; fileUrl: string; durationSec: number | null; createdAt: string }>(
      `/voice-profiles/${profileId}/assets`,
      form,
    );
  },
  train: (profileId: string) =>
    api.post<{ id: string; trainingStatus: string; message: string; providerVoiceId?: string }>(`/voice-profiles/${profileId}/train`, {}),
};

export interface MediaUploadResult {
  key: string;
  url: string;
}

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return postMultipart<MediaUploadResult>("/media/upload", form);
  },
};

/** Phase 7a: EDL / project editing */
export interface EdlTimelineClip {
  id?: string;
  clipUrl: string;
  inSec: number;
  outSec: number;
  startSec: number;
  /** Optional source duration for slip clamp (defaults to outSec + 300). */
  sourceDurationSec?: number;
}

export interface EdlTextOverlay {
  id?: string;
  type: "text";
  text: string;
  startSec: number;
  endSec: number;
  position?: "top" | "center" | "bottom";
  style?: string;
  stylePreset?: string;
}

export interface EdlAudio {
  voiceoverUrl: string;
  musicUrl?: string;
  voiceGainDb?: number;
  musicGainDb?: number;
  musicEnabled?: boolean;
  musicVolume?: number;
  voiceVolume?: number;
  /** Original video/clip volume (0–1). */
  originalVolume?: number;
  /** When true, original volume applies to all video clips. */
  applyOriginalToAll?: boolean;
  /** When true, video (clip) track is muted. */
  videoTrackMuted?: boolean;
  /** When true, audio (voiceover/music) track is muted. */
  audioTrackMuted?: boolean;
  /** When true, music track is muted. */
  musicTrackMuted?: boolean;
}

export interface EdlColor {
  saturation?: number;
  contrast?: number;
  vibrance?: number;
}

export interface EdlOutput {
  width: number;
  height: number;
  fps?: number;
}

export interface EDL {
  timeline: EdlTimelineClip[];
  overlays: EdlTextOverlay[];
  audio: EdlAudio;
  color?: EdlColor;
  output: EdlOutput;
}

export interface VideoProject {
  id: string;
  draftVideoUrl: string | null;
  edlUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportPreviewResponse {
  progress: number;
  previewImageUrl?: string;
}

export const projectsApi = {
  get: (projectId: string) => api.get<VideoProject>(`/projects/${projectId}`),
  getEdl: (projectId: string) => api.get<EDL>(`/projects/${projectId}/edl`),
  updateEdl: (projectId: string, edl: EDL) =>
    api.post<{ edlUrl: string }>(`/projects/${projectId}/edl/update`, edl),
  getExportPreview: (projectId: string) =>
    api.get<ExportPreviewResponse>(`/projects/${projectId}/export-preview`),
  renderDraft: (projectId: string) =>
    api.post<{ status: string; jobId?: string; draftVideoUrl?: string; message?: string }>(
      `/projects/${projectId}/render-draft`
    ),
};

export interface RenderStatus {
  status: 'rendering' | 'done' | 'failed';
  progress: number;
  etaSec?: number;
  previewImageUrl?: string;
  outputVideoUrl?: string;
}

export const rendersApi = {
  getStatus: (jobId: string) =>
    api.get<RenderStatus>(`/renders/${jobId}/status`),
};

/** Phase 7b.7: Review queue for batch runs */
export interface ReviewQueueItem {
  iterationId: string;
  itemIndex: number;
  title: string;
  status: "needs_review" | "approved" | "skipped" | "rendered" | "failed";
  decision: "pending" | "approved" | "skipped" | null;
  draftVideoUrl: string | null;
  voiceoverUrl: string | null;
  finalVideoUrl: string | null;
  /** Project ID for opening the EDL editor for this iteration (when draft exists). */
  projectId: string | null;
  /** When status is failed: error message from the failing step. */
  errorMessage: string | null;
  /** When status is failed: title of the node that failed. */
  failedNodeTitle: string | null;
  lastUpdatedAt: string;
}

export interface ReviewQueueResponse {
  runId: string;
  runStatus: string;
  workflowName?: string;
  totalItems: number;
  items: ReviewQueueItem[];
  counts: {
    needsReview: number;
    approved: number;
    skipped: number;
    rendered: number;
    failed: number;
  };
}

export const runsApi = {
  getReviewQueue: (runId: string) =>
    api.get<ReviewQueueResponse>(`/runs/${runId}/review-queue`),
  decideReview: (
    runId: string,
    iterationId: string,
    body: { decision: "approved" | "skipped"; notes?: string }
  ) =>
    api.post<unknown>(
      `/runs/${runId}/iterations/${iterationId}/review/decide`,
      body
    ),
  regenerateDraft: (runId: string, iterationId: string) =>
    api.post<unknown>(`/runs/${runId}/iterations/${iterationId}/regenerate-draft`),
};

export { ApiError };
