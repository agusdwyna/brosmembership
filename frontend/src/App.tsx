import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MembersPage } from '@/features/members/MembersPage';
import { MemberDetailPage } from '@/features/members/MemberDetailPage';
import { MemberCreatePage } from '@/features/members/MemberCreatePage';
import { CompaniesPage, CompanyFormPage } from '@/features/companies/CompaniesPage';
import {
  MembershipTypesPage,
  MembershipTypeFormPage,
} from '@/features/membership-types/MembershipTypesPage';
import { CardTemplatesPage } from '@/features/card-templates/CardTemplatesPage';
import { CardTemplateEditorPage } from '@/features/card-templates/CardTemplateEditorPage';
import { CardsPage } from '@/features/cards/CardsPage';
import { CardDetailPage } from '@/features/cards/CardDetailPage';
import { ScannerPage } from '@/features/scanner/ScannerPage';
import { ScanHistoryPage } from '@/features/scan-history/ScanHistoryPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfileTab } from '@/features/settings/ProfileTab';
import { UsersTab } from '@/features/settings/UsersTab';
import { BrandingTab } from '@/features/settings/BrandingTab';
import { NumberingTab } from '@/features/settings/NumberingTab';
import { PoliciesTab } from '@/features/settings/PoliciesTab';
import { ActivityTab } from '@/features/settings/ActivityTab';
import { SystemTab } from '@/features/settings/SystemTab';
import { RequireRole } from '@/components/shared/RequireRole';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ErrorBoundary>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="members/create" element={<MemberCreatePage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="companies/new" element={<CompanyFormPage />} />
          <Route path="companies/:id/edit" element={<CompanyFormPage />} />
          <Route path="membership-types" element={<MembershipTypesPage />} />
          <Route path="membership-types/new" element={<MembershipTypeFormPage />} />
          <Route path="membership-types/:id/edit" element={<MembershipTypeFormPage />} />
          <Route path="card-templates" element={<CardTemplatesPage />} />
          <Route path="card-templates/:id/edit" element={<CardTemplateEditorPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="cards/:id" element={<CardDetailPage />} />
          <Route path="scanner" element={<ScannerPage />} />
          <Route path="scan-history" element={<ScanHistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<ProfileTab />} />
            <Route
              path="users"
              element={
                <RequireRole role="ADMIN">
                  <UsersTab />
                </RequireRole>
              }
            />
            <Route
              path="branding"
              element={
                <RequireRole role="ADMIN">
                  <BrandingTab />
                </RequireRole>
              }
            />
            <Route
              path="numbering"
              element={
                <RequireRole role="ADMIN">
                  <NumberingTab />
                </RequireRole>
              }
            />
            <Route
              path="policies"
              element={
                <RequireRole role="ADMIN">
                  <PoliciesTab />
                </RequireRole>
              }
            />
            <Route
              path="activity"
              element={
                <RequireRole role="ADMIN">
                  <ActivityTab />
                </RequireRole>
              }
            />
            <Route path="system" element={<SystemTab />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
