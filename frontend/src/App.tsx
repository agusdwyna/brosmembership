import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/features/auth/api';
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
import { VisitsPage } from '@/features/visits/VisitsPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ChangePasswordPage } from '@/features/profile/ChangePasswordPage';
import { UsersTab } from '@/features/settings/UsersTab';
import { RolesTab } from '@/features/settings/RolesTab';
import { BrandingTab } from '@/features/settings/BrandingTab';
import { NumberingTab } from '@/features/settings/NumberingTab';
import { PoliciesTab } from '@/features/settings/PoliciesTab';
import { ActivityTab } from '@/features/settings/ActivityTab';
import { SystemTab } from '@/features/settings/SystemTab';
import { RequirePermission } from '@/components/shared/RequireRole';

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

/**
 * Index route: send each user to the first page their role can actually use, so
 * a scan-only role lands on the scanner instead of a Dashboard it can't load.
 */
function HomeRedirect() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  if (hasPermission('dashboard.view')) return <DashboardPage />;
  if (hasPermission('scan.perform')) return <Navigate to="/scanner" replace />;
  if (hasPermission('member.view')) return <Navigate to="/members" replace />;
  if (hasPermission('visit.view')) return <Navigate to="/visits" replace />;
  if (hasPermission('report.view')) return <Navigate to="/reports" replace />;
  if (hasPermission('company.view')) return <Navigate to="/companies" replace />;
  if (hasPermission('membershipType.view')) return <Navigate to="/membership-types" replace />;
  if (hasPermission('cardTemplate.view')) return <Navigate to="/card-templates" replace />;
  if (hasPermission('scanHistory.view')) return <Navigate to="/scan-history" replace />;
  if (hasPermission('card.view')) return <Navigate to="/cards" replace />;
  return <Navigate to="/profile" replace />;
}

/** Wrap a route element in a client-side permission gate. */
function guard(permission: string, element: React.ReactNode) {
  return <RequirePermission permission={permission}>{element}</RequirePermission>;
}

export function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    loadFromStorage();

    // Credentials stored before roles became permission-based have no
    // `permissions` array, which would hide permission-gated actions. Refresh
    // the profile (and therefore the permissions) from the API on every start.
    if (!localStorage.getItem('accessToken')) return;
    authApi
      .me()
      .then(({ data }) => setUser(data.data))
      .catch(() => {
        // 401 is handled by the axios interceptor (redirect to login).
      });
  }, [loadFromStorage, setUser]);

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
          <Route index element={<HomeRedirect />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/password" element={<ChangePasswordPage />} />
          <Route path="members" element={guard('member.view', <MembersPage />)} />
          <Route path="members/create" element={guard('member.create', <MemberCreatePage />)} />
          <Route path="members/:id" element={guard('member.view', <MemberDetailPage />)} />
          <Route path="companies" element={guard('company.view', <CompaniesPage />)} />
          <Route path="companies/new" element={guard('company.create', <CompanyFormPage />)} />
          <Route path="companies/:id/edit" element={guard('company.edit', <CompanyFormPage />)} />
          <Route
            path="membership-types"
            element={guard('membershipType.view', <MembershipTypesPage />)}
          />
          <Route
            path="membership-types/new"
            element={guard('membershipType.create', <MembershipTypeFormPage />)}
          />
          <Route
            path="membership-types/:id/edit"
            element={guard('membershipType.edit', <MembershipTypeFormPage />)}
          />
          <Route
            path="card-templates"
            element={guard('cardTemplate.view', <CardTemplatesPage />)}
          />
          <Route
            path="card-templates/:id/edit"
            element={guard('cardTemplate.view', <CardTemplateEditorPage />)}
          />
          <Route path="cards" element={guard('card.view', <CardsPage />)} />
          <Route path="cards/:id" element={guard('card.view', <CardDetailPage />)} />
          <Route path="scanner" element={guard('scan.perform', <ScannerPage />)} />
          <Route path="scan-history" element={guard('scanHistory.view', <ScanHistoryPage />)} />
          <Route path="visits" element={guard('visit.view', <VisitsPage />)} />
          <Route path="reports" element={guard('report.view', <ReportsPage />)} />
          <Route path="settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="/settings/system" replace />} />
            <Route
              path="users"
              element={
                <RequirePermission permission="user.manage">
                  <UsersTab />
                </RequirePermission>
              }
            />
            <Route
              path="roles"
              element={
                <RequirePermission permission="role.manage">
                  <RolesTab />
                </RequirePermission>
              }
            />
            <Route
              path="branding"
              element={
                <RequirePermission permission="settings.manage">
                  <BrandingTab />
                </RequirePermission>
              }
            />
            <Route
              path="numbering"
              element={
                <RequirePermission permission="settings.manage">
                  <NumberingTab />
                </RequirePermission>
              }
            />
            <Route
              path="policies"
              element={
                <RequirePermission permission="settings.manage">
                  <PoliciesTab />
                </RequirePermission>
              }
            />
            <Route
              path="activity"
              element={
                <RequirePermission permission="activityLog.view">
                  <ActivityTab />
                </RequirePermission>
              }
            />
            <Route path="system" element={<SystemTab />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
