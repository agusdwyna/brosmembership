import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSettingsStore } from '@/stores/settings-store';

export function MainLayout() {
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="lg:ml-[220px]">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
