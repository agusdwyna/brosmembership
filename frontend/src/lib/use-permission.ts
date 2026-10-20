import { useAuthStore } from '@/stores/auth-store';

/** True when the current user's role grants `permission`. */
export function useCan(permission: string): boolean {
  return useAuthStore((s) => (s.user?.permissions ?? []).includes(permission));
}
