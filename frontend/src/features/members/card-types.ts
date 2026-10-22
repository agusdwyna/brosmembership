/**
 * A card as returned by the card-aware endpoints (member detail, scanner,
 * template preview). Cards are issued per membership and are never browsed on
 * their own — they are shown inside the member they belong to, which is why
 * this shape lives with the member feature.
 */
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
      nikLast4: string | null;
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
        color?: string | null;
      }[];
    }[];
  };
}
