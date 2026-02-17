import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post<{ user: User; token: string }>(
            "/auth/login",
            { email, password },
          );
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : "Login failed";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (email, password, name?) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post<{ user: User; token: string }>(
            "/auth/register",
            { email, password, name },
          );
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : "Registration failed";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const data = await api.get<{ user: User }>("/auth/me");
          set({ user: data.user });
        } catch {
          set({ user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
