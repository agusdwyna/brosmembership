export type ScannerMethod = 'MANUAL' | 'PHYSICAL_READER' | 'CAMERA';
export type NumberReset = 'MONTHLY' | 'YEARLY' | 'GLOBAL';

export interface AppSettings {
  brandName: string;
  defaultScannerMethod: ScannerMethod;
  memberNumberPrefix: string;
  memberNumberReset: NumberReset;
  cardNumberPrefix: string;
  cardNumberReset: NumberReset;
  expiringSoonDays: string;
}

export interface UpdateSettingsInput {
  brandName?: string;
  defaultScannerMethod?: ScannerMethod;
  memberNumberPrefix?: string;
  memberNumberReset?: NumberReset;
  cardNumberPrefix?: string;
  cardNumberReset?: NumberReset;
  expiringSoonDays?: number;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OFFICER' | string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  key: string;
  label: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: string;
}

export interface SystemInfo {
  status: string;
  timestamp: string;
  version: string;
  env: string;
  db: 'ok' | 'error' | string;
  uptime: number;
}

export interface ActivityLogEntry {
  id: string;
  memberId: string | null;
  action: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
  createdAt: string;
  officer?: { id: string; name: string } | null;
  member?: { id: string; memberNumber: string; fullName: string } | null;
}
