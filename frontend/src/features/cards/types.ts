export interface MembershipCard {
  id: string;
  membershipId: string;
  cardNumber: string;
  cardTemplateId: string;
  templateVersion: number;
  issuedAt: string;
  createdAt: string;
  membership: {
    id: string;
    memberId: string;
    startDate: string;
    endDate: string;
    status: string;
    member: {
      id: string;
      memberNumber: string;
      nik: string | null;
      qrHash: string | null;
      fullName: string;
      photo?: string | null;
    };
    membershipType: { id: string; code: string; name: string };
  };
  cardTemplate: {
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
