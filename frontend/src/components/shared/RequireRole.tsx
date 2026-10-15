import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
  /** Where to send users who lack the role. Defaults to the settings profile tab. */
  fallback?: string;
}

/**
 * Client-side role gate for routes. The backend already enforces roles; this
 * only keeps unauthorised UI (and dead routes) out of reach for officers.
 */
export function RequireRole({ role, children, fallback = '/settings/profile' }: RequireRoleProps) {
  const userRole = useAuthStore((s) => s.user?.role);
  if (userRole !== role) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
