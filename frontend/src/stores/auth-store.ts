import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  /** Capabilities resolved from the user's role; used to gate UI. */
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, accessToken) => {
    const withPermissions = { ...user, permissions: user.permissions ?? [] };
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(withPermissions));
    set({ user: withPermissions, accessToken, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => {
    // Profile edits return the user without permissions; keep the ones we know.
    const merged = { ...user, permissions: user.permissions ?? get().user?.permissions ?? [] };
    localStorage.setItem('user', JSON.stringify(merged));
    set({ user: merged });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  hasPermission: (permission) => (get().user?.permissions ?? []).includes(permission),
}));
