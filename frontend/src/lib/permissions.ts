/**
 * Mirrors the backend permission catalog (backend/src/lib/permissions.ts) with
 * display labels, so the role editor can render a grouped matrix. Keep the
 * modules/actions here in sync with the backend catalog.
 */
export interface PermissionAction {
  key: string;
  label: string;
}

export interface PermissionModule {
  module: string;
  label: string;
  actions: PermissionAction[];
}

const VIEW: PermissionAction = { key: 'view', label: 'Lihat' };
const CREATE: PermissionAction = { key: 'create', label: 'Tambah' };
const EDIT: PermissionAction = { key: 'edit', label: 'Ubah' };
const MANAGE: PermissionAction = { key: 'manage', label: 'Kelola' };

export const PERMISSION_CATALOG: PermissionModule[] = [
  { module: 'dashboard', label: 'Dashboard', actions: [VIEW] },
  { module: 'member', label: 'Member', actions: [VIEW, CREATE, EDIT, MANAGE] },
  { module: 'company', label: 'Perusahaan', actions: [VIEW, CREATE, EDIT, MANAGE] },
  {
    module: 'membershipType',
    label: 'Tipe Membership',
    actions: [VIEW, CREATE, EDIT, MANAGE],
  },
  { module: 'membership', label: 'Membership', actions: [VIEW, MANAGE] },
  { module: 'cardTemplate', label: 'Template Kartu', actions: [VIEW, MANAGE] },
  { module: 'card', label: 'Kartu', actions: [VIEW] },
  { module: 'scan', label: 'Scanner', actions: [{ key: 'perform', label: 'Lakukan scan' }] },
  { module: 'visit', label: 'Kunjungan', actions: [VIEW, CREATE] },
  { module: 'scanHistory', label: 'Riwayat Scan', actions: [VIEW] },
  { module: 'report', label: 'Laporan', actions: [VIEW] },
  { module: 'activityLog', label: 'Log Aktivitas', actions: [VIEW] },
  { module: 'user', label: 'Pengguna', actions: [MANAGE] },
  { module: 'role', label: 'Role & Akses', actions: [MANAGE] },
  { module: 'settings', label: 'Pengaturan', actions: [MANAGE] },
];

export const permissionKey = (module: string, action: string): string => `${module}.${action}`;
