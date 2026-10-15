export interface Member {
  id: string;
  memberNumber: string;
  nik: string | null;
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
  nik?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  companyId?: string;
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
