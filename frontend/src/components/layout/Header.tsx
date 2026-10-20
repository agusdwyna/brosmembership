import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useSettingsStore } from '@/stores/settings-store';
import { ChevronDown, KeyRound, LogOut, Menu, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Header() {
  const { user, logout } = useAuthStore();
  const toggle = useSidebarStore((s) => s.toggle);
  const brandName = useSettingsStore((s) => s.settings.brandName);
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

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

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-[4px] hover:bg-bg transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
            {initials || <UserRound className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-[13px] font-medium text-foreground leading-tight">
              {user?.name}
            </div>
            <div className="text-[11px] text-muted leading-tight">{user?.role}</div>
          </div>
          <ChevronDown
            className={cn('w-4 h-4 text-muted transition-transform', menuOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-[4px] shadow-sm py-1 z-50"
          >
            <div className="px-3 py-2 border-b border-border">
              <div className="text-[13px] font-medium text-foreground truncate">{user?.name}</div>
              <div className="text-[11px] text-muted truncate">{user?.email}</div>
            </div>
            <button
              role="menuitem"
              onClick={() => go('/profile')}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-bg transition-colors"
            >
              <UserRound className="w-4 h-4 text-muted" /> Profil Saya
            </button>
            <button
              role="menuitem"
              onClick={() => go('/profile/password')}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-foreground hover:bg-bg transition-colors"
            >
              <KeyRound className="w-4 h-4 text-muted" /> Ganti Password
            </button>
            <div className="border-t border-border my-1" />
            <button
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
