import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';

interface Tab {
  to: string;
  label: string;
  adminOnly?: boolean;
}

const tabs: Tab[] = [
  { to: '/settings/profile', label: 'Profil' },
  { to: '/settings/users', label: 'Pengguna', adminOnly: true },
  { to: '/settings/branding', label: 'Branding', adminOnly: true },
  { to: '/settings/numbering', label: 'Penomoran', adminOnly: true },
  { to: '/settings/policies', label: 'Kebijakan', adminOnly: true },
  { to: '/settings/activity', label: 'Aktivitas', adminOnly: true },
  { to: '/settings/system', label: 'Info Sistem' },
];

export function SettingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const visibleTabs = tabs.filter((t) => !t.adminOnly || role === 'ADMIN');

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
