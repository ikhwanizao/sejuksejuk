import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  access: string | null;
  refresh: string | null;
  user: User | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      access: null,
      refresh: null,
      user: null,
      setTokens: (access, refresh) => {
        localStorage.setItem("access", access);
        localStorage.setItem("refresh", refresh);
        set({ access, refresh });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        set({ access: null, refresh: null, user: null });
      },
      isAuthenticated: () => !!get().access && !!get().user,
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        access: state.access,
        refresh: state.refresh,
        user: state.user,
      }),
    },
  ),
);
