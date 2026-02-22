const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

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

export { ApiError };
