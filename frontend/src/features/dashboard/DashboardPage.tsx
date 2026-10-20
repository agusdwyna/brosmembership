import { useEffect, useState } from 'react';
import { dashboardApi } from './api';
import type { DashboardSummary, RecentVerification } from './types';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, TrendingUp, UserPlus, Activity } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  EXPIRED: '#ef4444',
  SUSPENDED: '#f59e0b',
  CANCELLED: '#6b7280',
};

const RESULT_COLORS: Record<string, string> = {
  VALID: '#22c55e',
  EXPIRED: '#ef4444',
  REVOKED: '#ef4444',
  SUSPENDED: '#f59e0b',
  CANCELLED: '#ef4444',
  NOT_FOUND: '#6b7280',
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [growthView, setGrowthView] = useState<'monthly' | 'weekly'>('monthly');

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then((res) => {
        setData(res.data.data);
      })
      .catch(() => {
        setError('Gagal memuat data dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 sm:h-24 bg-surface rounded-[4px] border border-border animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="h-52 sm:h-64 bg-surface rounded-[4px] border border-border animate-pulse" />
          <div className="h-52 sm:h-64 bg-surface rounded-[4px] border border-border animate-pulse" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
        <p className="text-[14px] text-danger mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-[13px] text-brand hover:underline"
        >
          Reload page
        </button>
      </div>
    );
  }
  if (!data) return null;

  const growthData = growthView === 'monthly' ? data.monthlyGrowth : data.weeklyGrowth;

  const pieData = data.membershipOverview.map((item) => ({
    name: item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  }));

  const maxTypeCount = Math.max(...data.membershipByType.map((t) => t.count), 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">Dashboard Membership</h1>
        <p className="text-[13px] text-secondary mt-0.5">Overview program membership</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-brand/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[12px] text-muted">Total Member</p>
                <p className="text-[18px] sm:text-[22px] font-semibold leading-tight">
                  {data.totalMembers.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-success/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[12px] text-muted">Active</p>
                <p className="text-[18px] sm:text-[22px] font-semibold leading-tight">
                  {data.activeMemberships.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-[11px] text-success mt-0.5">
                  {data.totalMembers > 0
                    ? Math.round((data.activeMemberships / data.totalMembers) * 100)
                    : 0}
                  % of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-brand/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[12px] text-muted">New This Mo.</p>
                <p className="text-[18px] sm:text-[22px] font-semibold leading-tight">
                  +{data.newThisMonth.toLocaleString()}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted mt-0.5">vs last month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-brand/10 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-[12px] text-muted">Utilization</p>
                <p className="text-[18px] sm:text-[22px] font-semibold leading-tight">
                  {data.utilization}%
                </p>
                <p className="text-[10px] sm:text-[11px] text-success mt-0.5">active rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Membership Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-[14px] font-semibold">Pertumbuhan Member</h3>
            <div className="flex rounded-[4px] border border-border overflow-hidden">
              <button
                onClick={() => setGrowthView('monthly')}
                className={`px-3 py-1 text-[12px] font-medium transition-colors ${
                  growthView === 'monthly'
                    ? 'bg-brand text-white'
                    : 'bg-surface text-secondary hover:text-foreground'
                }`}
              >
                Bulanan
              </button>
              <button
                onClick={() => setGrowthView('weekly')}
                className={`px-3 py-1 text-[12px] font-medium transition-colors ${
                  growthView === 'weekly'
                    ? 'bg-brand text-white'
                    : 'bg-surface text-secondary hover:text-foreground'
                }`}
              >
                Mingguan
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand, #B82230)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-brand, #B82230)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #EDF1F2)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8DA2B5' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8DA2B5' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface, #fff)',
                      border: '1px solid var(--color-border, #EDF1F2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="New Members"
                    stroke="var(--color-brand, #B82230)"
                    fill="url(#colorGrowth)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Membership Status Pie */}
        <Card>
          <CardHeader>
            <h3 className="text-[14px] font-semibold">Status Membership</h3>
          </CardHeader>
          <CardContent>
            <div className="h-auto sm:h-52 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
              <div className="w-36 h-36 sm:w-44 sm:h-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface, #fff)',
                        border: '1px solid var(--color-border, #EDF1F2)',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {data.membershipOverview.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }}
                      />
                      <StatusBadge status={item.status} />
                    </div>
                    <span className="text-[14px] font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Type + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Membership Type — Horizontal Bars */}
        <Card>
          <CardHeader>
            <h3 className="text-[14px] font-semibold">Membership Type</h3>
          </CardHeader>
          <CardContent>
            {data.membershipByType.length === 0 ? (
              <p className="text-[13px] text-muted py-4 text-center">Tidak ada data</p>
            ) : (
              <div className="space-y-3">
                {data.membershipByType.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{item.name}</span>
                      <span className="text-[13px] font-semibold">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h3 className="text-[14px] font-semibold">Aktivitas Terkini</h3>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentVerifications.length === 0 ? (
              <p className="text-[13px] text-muted py-4 text-center">Belum ada aktivitas</p>
            ) : (
              <div className="divide-y divide-border">
                {data.recentVerifications.slice(0, 8).map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({ item }: { item: RecentVerification }) {
  const resultLabel: Record<string, string> = {
    VALID: 'verified',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    NOT_FOUND: 'not found',
  };

  const methodLabel: Record<string, string> = {
    MANUAL: 'Manual',
    PHYSICAL_READER: 'Reader',
    CAMERA: 'Camera',
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: RESULT_COLORS[item.result] || '#6b7280' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground truncate">
          <span className="font-medium">{item.member?.fullName || 'Unknown'}</span>
          <span className="text-muted"> — {resultLabel[item.result] || item.result}</span>
        </p>
        <p className="text-[11px] text-muted">
          {item.member?.memberNumber || item.card?.cardNumber || '-'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[12px] text-secondary">{format(new Date(item.createdAt), 'HH:mm')}</p>
        <p className="text-[11px] text-muted">
          {methodLabel[item.scannerMethod] || item.scannerMethod}
        </p>
      </div>
    </div>
  );
}
