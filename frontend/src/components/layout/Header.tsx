import { useAuthStore } from '@/stores/auth-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useSettingsStore } from '@/stores/settings-store';
import { LogOut, Menu } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuthStore();
  const toggle = useSidebarStore((s) => s.toggle);
  const brandName = useSettingsStore((s) => s.settings.brandName);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden p-2 text-muted hover:text-foreground hover:bg-bg rounded-[4px] transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-[15px] font-semibold text-foreground truncate">{brandName}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-[13px] text-right">
          <div className="font-medium text-foreground">{user?.name}</div>
          <div className="text-[11px] text-muted">{user?.role}</div>
        </div>
        <button
          onClick={logout}
          className="p-2 text-muted hover:text-foreground hover:bg-bg rounded-[4px] transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
