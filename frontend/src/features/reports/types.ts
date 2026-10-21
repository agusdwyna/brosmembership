export interface VerificationReport {
  totalScans: number;
  successful: number;
  failed: number;
  breakdown: { result: string; count: number }[];
  scanHistory: ScanHistoryReportItem[];
  totalVisits: number;
  visits: VisitReportItem[];
}

export interface VisitReportItem {
  id: string;
  createdAt: string;
  member: { id: string; memberNumber: string; fullName: string };
  membership?: { status: string } | null;
  officer: { name: string };
}

export interface ScanHistoryReportItem {
  id: string;
  result: string;
  reason?: string;
  scannerMethod: string;
  createdAt: string;
  member?: { id: string; memberNumber: string; fullName: string } | null;
  officer: { name: string };
}
