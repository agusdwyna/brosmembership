export interface VisitItem {
  id: string;
  createdAt: string;
  member: { id: string; memberNumber: string; nikLast4: string | null; fullName: string };
  membership?: { id: string; status: string } | null;
  officer: { id: string; name: string };
}
