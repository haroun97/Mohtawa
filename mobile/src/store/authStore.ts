import { create } from 'zustand';
import { apiUnauth } from '../lib/api';
import { apiClient } from '../lib/api';
import { authStorage } from '../lib/authStorage';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  hydrated: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiUnauth<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await authStorage.setToken(data.token);
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiUnauth<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: { email, password, name },
      });
      await authStorage.setToken(data.token);
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Registration failed',
      });
      throw err;
    }
  },

  logout: async () => {
    await authStorage.clearToken();
    set({ user: null, error: null });
  },

  fetchMe: async () => {
    try {
      const data = await apiClient.get<{ user: User }>('/auth/me');
      set({ user: data.user });
    } catch {
      await authStorage.clearToken();
      set({ user: null });
    }
  },

  clearError: () => set({ error: null }),

  hydrate: async () => {
    const token = await authStorage.getToken();
    if (!token) {
      set({ user: null, hydrated: true });
      return;
    }
    try {
      const data = await apiClient.get<{ user: User }>('/auth/me');
      set({ user: data.user, hydrated: true });
    } catch {
      await authStorage.clearToken();
      set({ user: null, hydrated: true });
    }
  },
}));
