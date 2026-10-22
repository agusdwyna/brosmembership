export interface Member {
  id: string;
  memberNumber: string;
  /** Last four digits only — the full NIK is never returned by the API. */
  nikLast4: string | null;
  qrHash: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  photo?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  companyId?: string | null;
  company?: CompanySummary | null;
  status: string;
  /** Set when the member is soft-deleted; only listed via `deleted: true`. */
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: Membership[];
}

export interface CompanySummary {
  id: string;
  code: string;
  name: string;
}

export interface Membership {
  id: string;
  memberId: string;
  membershipTypeId: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  membershipType: MembershipTypeSummary;
  cards: MembershipCardSummary[];
}

export interface MembershipTypeSummary {
  id: string;
  code: string;
  name: string;
  /** Days added to a start date to derive the expiry. */
  duration: number;
}

export interface MembershipCardSummary {
  id: string;
  membershipId: string;
  cardNumber: string;
  cardTemplateId: string;
  templateVersion: number;
  issuedAt: string;
  createdAt: string;
  cardTemplate?: {
    id: string;
    name: string;
    sides: {
      id: string;
      side: string;
      designUrl?: string | null;
      elements: {
        id: string;
        type: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize?: number | null;
        fontWeight?: string | null;
        alignment?: string | null;
      }[];
    }[];
  };
}

export interface CreateMemberInput {
  fullName: string;
  nik: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  companyId?: string;
  membershipTypeId: string;
  startDate: string;
}

export interface UpdateMemberInput {
  fullName?: string;
  /** Send only to replace the stored NIK; omit it to keep the current one. */
  nik?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  companyId?: string;
}

/**
 * A parsed import row plus the choices made on the preview screen. The row is
 * editable there: company/type codes from the file are resolved to ids, and the
 * operator can correct any cell before submitting.
 */
export interface ImportRowDraft {
  rowNumber: number;
  fullName: string;
  nik: string;
  phone: string;
  email: string;
  address: string;
  /** Omitted when the source cell was blank; the backend treats it as absent. */
  dateOfBirth?: string;
  companyId: string;
  membershipTypeId: string;
  startDate: string;
  /** Code as written in the file, kept to explain an unmatched company. */
  companyCode?: string;
  /** Code as written in the file, kept to explain an unmatched type. */
  typeCode?: string;
}

export interface ImportFailedRow {
  rowNumber: number;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: ImportFailedRow[];
}

export interface ActivityLogItem {
  id: string;
  memberId: string;
  action: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  officer: { id: string; name: string };
}
