export type PublicValidity = 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'INACTIVE';

export interface PublicCardSide {
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
}

/** Shape returned by `GET /api/public/cards/:token` and `POST /cards/lookup`. */
export interface PublicCardResponse {
  member: {
    fullName: string;
    memberNumber: string;
    qrHash: string | null;
    photo?: string | null;
  };
  membership: {
    status: string;
    startDate: string;
    endDate: string;
    typeName: string;
  };
  validity: PublicValidity;
  card: {
    templateVersion: number;
    template: {
      name: string;
      sides: PublicCardSide[];
    };
  };
}
