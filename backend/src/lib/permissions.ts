/**
 * Central permission catalog — the single source of truth for every capability
 * the API checks. Keeping it in code (not the DB) means a role can only ever be
 * granted known permissions: the roles module rejects anything not listed here,
 * and the frontend renders its permission matrix from this same shape.
 */
export const PERMISSIONS = {
  dashboard: ['view'],
  member: ['view', 'create', 'edit', 'manage'],
  company: ['view', 'create', 'edit', 'manage'],
  membershipType: ['view', 'create', 'edit', 'manage'],
  membership: ['view', 'manage'],
  cardTemplate: ['view', 'manage'],
  card: ['view'],
  scan: ['perform'],
  visit: ['view', 'create'],
  scanHistory: ['view'],
  report: ['view'],
  activityLog: ['view'],
  user: ['manage'],
  role: ['manage'],
  settings: ['manage'],
} as const;

export type PermissionModule = keyof typeof PERMISSIONS;
export type Permission = `${PermissionModule}.${string}`;

/** Flat list of every valid permission string, e.g. `member.view`. */
export const ALL_PERMISSIONS: string[] = Object.entries(PERMISSIONS).flatMap(([module, actions]) =>
  actions.map((action) => `${module}.${action}`),
);

export const isPermission = (value: string): boolean => ALL_PERMISSIONS.includes(value);

/** Permissions that gate user/role administration — used by the last-admin guard. */
export const ADMINISTRATIVE_PERMISSIONS = ['user.manage', 'role.manage'];

// Default permission sets for the built-in roles. Their definition lives in
// code, so re-seeding keeps them in sync; custom roles created in the UI are
// never touched by the seed.
export interface RoleSeed {
  key: string;
  label: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    key: 'IT_GOD',
    label: 'IT God',
    description: 'Akses penuh ke seluruh sistem.',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    key: 'ADMIN',
    label: 'Admin',
    description: 'Akses penuh kecuali pengaturan aplikasi.',
    permissions: ALL_PERMISSIONS.filter((p) => p !== 'settings.manage'),
    isSystem: true,
  },
  {
    key: 'OFFICER',
    label: 'Petugas',
    description: 'Memindai kartu dan mencatat kunjungan member.',
    permissions: ['scan.perform', 'visit.create', 'visit.view'],
    isSystem: true,
  },
];
