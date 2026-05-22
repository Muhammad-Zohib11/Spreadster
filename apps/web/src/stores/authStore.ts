import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id?: string;
  name: string;
  email?: string;
  role?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  initFromToken: (token: string, name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,

      login(token, user) {
        set({ isAuthenticated: true, token, user });
      },

      logout() {
        set({ isAuthenticated: false, token: null, user: null });
      },

      initFromToken(token, name) {
        set({ isAuthenticated: true, token, user: { name } });
      },
    }),
    {
      name: 'spreadster-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        user: state.user,
      }),
    },
  ),
);
