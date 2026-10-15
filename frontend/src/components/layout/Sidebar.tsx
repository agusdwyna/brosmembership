import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  ScanLine,
  History,
  FileText,
  Settings,
  Layers,
  ListChecks,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSidebarStore } from '@/stores/sidebar-store';
import { BrandLogos } from '@/components/shared/BrandLogos';

const navSections = [
  {
    label: 'OVERVIEW',
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'VERIFICATION',
    items: [
      { to: '/scanner', icon: ScanLine, label: 'Scanner' },
      { to: '/scan-history', icon: History, label: 'Scan History' },
    ],
  },
  {
    label: 'MEMBERSHIP',
    items: [
      { to: '/members', icon: Users, label: 'Members' },
      { to: '/companies', icon: Building2, label: 'Companies' },
      { to: '/membership-types', icon: ListChecks, label: 'Memberships' },
      { to: '/card-templates', icon: Layers, label: 'Templates' },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [{ to: '/reports', icon: FileText, label: 'Reports' }],
  },
  {
    label: 'SYSTEM',
    items: [{ to: '/settings', icon: Settings, label: 'Settings' }],
  },
];

function NavContent() {
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      <div className="h-14 flex items-center justify-between px-5 border-b border-border bg-surface">
        <BrandLogos variant="onLight" size="sm" />
        <button
          onClick={close}
          className="lg:hidden p-1 text-muted hover:text-foreground rounded-[4px]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-4 py-2 text-[10px] font-medium text-white/30 uppercase tracking-widest">
              {section.label}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 mx-2 px-3 py-2 rounded-[4px] text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

export function Sidebar() {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const close = useSidebarStore((s) => s.close);

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden lg:flex w-[220px] bg-brand-dark h-screen flex-col fixed left-0 top-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={close} />
          <aside className="fixed left-0 top-0 w-[260px] h-full bg-brand-dark flex flex-col z-50">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
