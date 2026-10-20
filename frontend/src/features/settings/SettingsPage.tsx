import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';

interface Tab {
  to: string;
  label: string;
  permission?: string;
}

const tabs: Tab[] = [
  { to: '/settings/users', label: 'Pengguna', permission: 'user.manage' },
  { to: '/settings/roles', label: 'Peran & Akses', permission: 'role.manage' },
  { to: '/settings/branding', label: 'Branding', permission: 'settings.manage' },
  { to: '/settings/numbering', label: 'Penomoran', permission: 'settings.manage' },
  { to: '/settings/policies', label: 'Kebijakan', permission: 'settings.manage' },
  { to: '/settings/activity', label: 'Aktivitas', permission: 'activityLog.view' },
  { to: '/settings/system', label: 'Info Sistem' },
];

export function SettingsPage() {
  const userPermissions = useAuthStore((s) => s.user?.permissions);
  const permissions = userPermissions ?? [];
  const visibleTabs = tabs.filter((t) => !t.permission || permissions.includes(t.permission));

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Kelola profil, pengguna, branding, penomoran, dan konfigurasi sistem"
      />

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'px-3 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-secondary hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
