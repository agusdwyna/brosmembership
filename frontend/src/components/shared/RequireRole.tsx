import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
  /** Where to send users who lack the permission. Defaults to the profile page. */
  fallback?: string;
}

/**
 * Client-side capability gate for routes. The backend enforces the same
 * permission; this only keeps UI the user can't use out of reach.
 */
export function RequirePermission({
  permission,
  children,
  fallback = '/profile',
}: RequirePermissionProps) {
  const allowed = useAuthStore((s) => (s.user?.permissions ?? []).includes(permission));
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
