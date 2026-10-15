export type ScannerMethod = 'MANUAL' | 'PHYSICAL_READER' | 'CAMERA';

export type VerifyResult = 'VALID' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'NOT_FOUND';

export interface VerifyResponse {
  result: VerifyResult;
  reason?: string;
  member?: {
    id: string;
    memberNumber: string;
    nik: string;
    qrHash: string;
    fullName: string;
  };
  membership?: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    typeName: string;
  };
  card?: {
    id: string;
    cardNumber: string;
    template: {
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
  };
}
