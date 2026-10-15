export interface VerificationReport {
  totalScans: number;
  successful: number;
  failed: number;
  breakdown: { result: string; count: number }[];
  scanHistory: ScanHistoryReportItem[];
}

export interface ScanHistoryReportItem {
  id: string;
  result: string;
  reason?: string;
  scannerMethod: string;
  createdAt: string;
  member?: { id: string; memberNumber: string; fullName: string } | null;
  card?: { cardNumber: string } | null;
  officer: { name: string };
}
