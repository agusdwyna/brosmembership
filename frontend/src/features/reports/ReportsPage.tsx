import { useEffect, useState, useMemo, useCallback } from 'react';
import { reportsApi } from './api';
import type { VerificationReport, ScanHistoryReportItem, VisitReportItem } from './types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { useNavigate } from 'react-router-dom';
import { format, subDays, parseISO } from 'date-fns';
import { formatDate, formatDateTime } from '@/lib/date';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, CheckCircle2, XCircle, BarChart3, CalendarCheck } from 'lucide-react';
import { toast } from '@/components/ui/toast-store';

const presets = [
  { label: 'Today', days: 0 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const RESULT_COLORS: Record<string, string> = {
  VALID: '#22c55e',
  EXPIRED: '#ef4444',
  REVOKED: '#ef4444',
  SUSPENDED: '#f59e0b',
  CANCELLED: '#ef4444',
  NOT_FOUND: '#6b7280',
};

export function ReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [activePreset, setActivePreset] = useState(7);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const { data } = await reportsApi.getVerifications(from, to);
      setReport(data.data);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount; subsequent loads are triggered by applyPreset / Go button
  useEffect(() => {
    load(dateFrom, dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (days: number) => {
    const to = new Date();
    const from = format(subDays(to, days), 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');
    setActivePreset(days);
    setDateFrom(from);
    setDateTo(toStr);
    load(from, toStr);
  };

  // Daily trend merges scans and visits so both appear on one timeline.
  const dailyTrend = useMemo(() => {
    if (!report) return [];
    const map = new Map<
      string,
      { key: string; date: string; valid: number; failed: number; visits: number }
    >();
    const ensure = (iso: string) => {
      const parsed = parseISO(iso);
      const key = format(parsed, 'yyyy-MM-dd');
      let entry = map.get(key);
      if (!entry) {
        // Axis label only (the year is constant across the range), so the
        // chart stays readable while still reading day-first like every table.
        entry = { key, date: formatDate(parsed).slice(0, 5), valid: 0, failed: 0, visits: 0 };
        map.set(key, entry);
      }
      return entry;
    };

    report.scanHistory.forEach((item) => {
      const entry = ensure(item.createdAt);
      if (item.result === 'VALID') entry.valid++;
      else entry.failed++;
    });
    report.visits.forEach((item) => {
      ensure(item.createdAt).visits++;
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [report]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!report?.breakdown?.length) return [];
    return report.breakdown.map((b) => ({
      name: b.result,
      value: b.count,
      color: RESULT_COLORS[b.result] || '#6b7280',
    }));
  }, [report]);

  // Filtered scan history
  const filteredHistory = useMemo(() => {
    if (!report?.scanHistory) return [];
    if (!search) return report.scanHistory;
    const q = search.toLowerCase();
    return report.scanHistory.filter(
      (i) =>
        i.member?.fullName?.toLowerCase().includes(q) ||
        i.member?.memberNumber?.toLowerCase().includes(q) ||
        i.officer?.name?.toLowerCase().includes(q),
    );
  }, [report, search]);

  const successRate = report ? Math.round((report.successful / (report.totalScans || 1)) * 100) : 0;

  const columns = [
    {
      key: 'member',
      header: 'Member',
      render: (i: ScanHistoryReportItem) => (
        <div>
          <div className="font-medium">{i.member?.fullName || '-'}</div>
          <div className="text-[12px] text-muted">{i.member?.memberNumber}</div>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      render: (i: ScanHistoryReportItem) => <StatusBadge status={i.result} />,
    },
    {
      key: 'method',
      header: 'Method',
      render: (i: ScanHistoryReportItem) => (
        <span className="text-secondary">{i.scannerMethod.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (i: ScanHistoryReportItem) => (
        <span className="text-secondary">{formatDateTime(i.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (i: ScanHistoryReportItem) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Lihat member',
              variant: 'brand',
              disabled: !i.member?.id,
              onClick: () => i.member?.id && navigate(`/members/${i.member.id}`),
            },
          ]}
        />
      ),
    },
  ];

  const visitColumns = [
    {
      key: 'member',
      header: 'Member',
      render: (v: VisitReportItem) => (
        <div>
          <div className="font-medium">{v.member?.fullName || '-'}</div>
          <div className="text-[12px] text-muted">{v.member?.memberNumber}</div>
        </div>
      ),
    },
    {
      key: 'officer',
      header: 'Petugas',
      render: (v: VisitReportItem) => (
        <span className="text-secondary">{v.officer?.name || '-'}</span>
      ),
    },
    {
      key: 'membership',
      header: 'Membership',
      render: (v: VisitReportItem) =>
        v.membership?.status ? <StatusBadge status={v.membership.status} /> : '-',
    },
    {
      key: 'time',
      header: 'Waktu',
      render: (v: VisitReportItem) => (
        <span className="text-secondary">{formatDateTime(v.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (v: VisitReportItem) => (
        <RowActions
          actions={[
            {
              key: 'detail',
              label: 'Lihat member',
              variant: 'brand',
              disabled: !v.member?.id,
              onClick: () => v.member?.id && navigate(`/members/${v.member.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Laporan" description="Analitik verifikasi dan laporan aktivitas" />

      {/* Filter — simple preset buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        {presets.map((p) => (
          <Button
            key={p.label}
            variant={activePreset === p.days ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setActivePreset(-1);
            }}
            className="h-8 px-2.5 rounded-[4px] border border-border bg-surface text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <span className="text-muted text-[12px]">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setActivePreset(-1);
            }}
            className="h-8 px-2.5 rounded-[4px] border border-border bg-surface text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <Button
            size="sm"
            onClick={() => {
              setActivePreset(-1);
              load(dateFrom, dateTo);
            }}
            loading={loading}
          >
            Go
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !report ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 sm:h-24 bg-surface rounded-[4px] border border-border animate-pulse"
            />
          ))}
        </div>
      ) : report ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-brand/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-muted">Total Scan</p>
                    <p className="text-[18px] sm:text-[20px] font-semibold">{report.totalScans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-success/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-success" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-muted">Berhasil</p>
                    <p className="text-[18px] sm:text-[20px] font-semibold text-success">
                      {report.successful}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-danger/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-danger" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-muted">Failed</p>
                    <p className="text-[18px] sm:text-[20px] font-semibold text-danger">
                      {report.failed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-gold/10 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gold" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-muted">Kunjungan</p>
                    <p className="text-[18px] sm:text-[20px] font-semibold">{report.totalVisits}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 sm:py-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 rounded-[4px] bg-brand/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-brand" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] text-muted">Success Rate</p>
                    <p className="text-[18px] sm:text-[20px] font-semibold">{successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Result Breakdown — full width */}
          {pieData.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-[14px] font-semibold">Result Breakdown</h3>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                  <div className="w-44 h-44 sm:w-56 sm:h-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
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
                  <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {pieData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-3 rounded-[4px] border border-border bg-bg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <StatusBadge status={item.name} />
                          </div>
                          <span className="text-[14px] font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Trend — full width */}
          {dailyTrend.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-[14px] font-semibold">Tren Harian</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-2">
                  <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" /> Valid
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full bg-danger" /> Failed
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full bg-gold" /> Kunjungan
                  </span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="colorValid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9A34E" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#C9A34E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #EDF1F2)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8DA2B5' }} />
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
                        dataKey="valid"
                        name="Valid"
                        stroke="#22c55e"
                        fill="url(#colorValid)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="failed"
                        name="Failed"
                        stroke="#ef4444"
                        fill="url(#colorFailed)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        name="Kunjungan"
                        stroke="#C9A34E"
                        fill="url(#colorVisits)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visits Table */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-[14px] font-semibold">Kunjungan</h3>
            </CardHeader>
            <DataTable
              columns={visitColumns}
              data={report.visits}
              emptyTitle="Belum ada kunjungan"
              emptyDescription="Kunjungan tercatat setelah petugas mengonfirmasi hasil scan yang valid."
              getRowId={(v) => v.id}
              pageSize={10}
            />
          </Card>

          {/* Scan History Table */}
          <Card>
            <CardHeader>
              <h3 className="text-[14px] font-semibold">Scan History</h3>
            </CardHeader>
            <TableToolbar>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Cari member, kartu, petugas..."
              />
            </TableToolbar>
            <DataTable
              columns={columns}
              data={filteredHistory}
              emptyTitle="No scan data"
              getRowId={(i) => i.id}
              pageSize={10}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
