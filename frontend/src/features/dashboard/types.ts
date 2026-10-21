export interface DashboardSummary {
  totalMembers: number;
  activeMemberships: number;
  expiringSoon: number;
  todayScans: number;
  todayVisits: number;
  totalVisits: number;
  newThisMonth: number;
  utilization: number;
  membershipOverview: MembershipOverviewItem[];
  membershipByType: MembershipByTypeItem[];
  monthlyGrowth: GrowthItem[];
  weeklyGrowth: GrowthItem[];
  monthlyVisits: GrowthItem[];
  weeklyVisits: GrowthItem[];
  recentVerifications: RecentVerification[];
}

export interface RecentVerification {
  id: string;
  result: string;
  reason?: string;
  scannerMethod: string;
  createdAt: string;
  member?: { memberNumber: string; fullName: string };
  membership?: { status: string };
  officer: { name: string };
}

export interface MembershipOverviewItem {
  status: string;
  count: number;
}

export interface MembershipByTypeItem {
  name: string;
  count: number;
}

export interface GrowthItem {
  label: string;
  count: number;
}
