export interface ScanHistoryItem {
  id: string;
  result: string;
  reason?: string;
  scannerMethod: string;
  createdAt: string;
  member?: { id: string; memberNumber: string; nik: string; fullName: string } | null;
  membership?: { id: string; status: string } | null;
  officer: { id: string; name: string };
}
