import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { membersApi } from './api';
import { activityLogApi } from './activity-log-api';
import { visitsApi } from '@/features/visits/api';
import type { VisitItem } from '@/features/visits/types';
import { useAuthStore } from '@/stores/auth-store';
import { useCan } from '@/lib/use-permission';
import type { Member, ActivityLogItem, Membership, UpdateMemberInput } from './types';
import { updateMemberSchema } from './validation';
import { useFormErrors } from '@/lib/use-form-error';
import { membershipTypesApi } from '@/features/membership-types/api';
import type { MembershipType } from '@/features/membership-types/types';
import { companiesApi } from '@/features/companies/api';
import type { Company } from '@/features/companies/types';
import { membershipsApi } from '@/features/memberships/api';
import { addDays } from '@/lib/date';
import { CardPreview } from './components/CardPreview';
import { printCard } from '@/lib/pdf-export';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/toast-store';
import { getErrorMessage } from '@/lib/error';
import {
  RotateCcw,
  Ban,
  ArrowRightLeft,
  CalendarClock,
  Clock,
  Pencil,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { formatDate, formatDateTime, toDateInputValue } from '@/lib/date';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  ASSIGN: <RotateCcw className="w-3.5 h-3.5" />,
  CHANGE_TYPE: <ArrowRightLeft className="w-3.5 h-3.5" />,
  RENEW: <RotateCcw className="w-3.5 h-3.5" />,
  SUSPEND: <Ban className="w-3.5 h-3.5" />,
  CANCEL: <Ban className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  ASSIGN: 'bg-success/10 text-success',
  CHANGE_TYPE: 'bg-brand/10 text-brand',
  RENEW: 'bg-success/10 text-success',
  SUSPEND: 'bg-warning/10 text-warning',
  CANCEL: 'bg-danger/10 text-danger',
};

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => s.user?.permissions) ?? [];
  const canViewActivity = permissions.includes('activityLog.view');
  const canViewVisits = permissions.includes('visit.view');
  const canManageMember = useCan('member.manage');
  const canDeleteMember = useCan('member.delete');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; targetId: string } | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Edit membership period modal
  const [showEditDates, setShowEditDates] = useState(false);
  const [datesForm, setDatesForm] = useState({ startDate: '', endDate: '' });
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesError, setDatesError] = useState('');

  // Change type modal
  const [showChangeType, setShowChangeType] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [newTypeId, setNewTypeId] = useState('');
  const [changeTypeLoading, setChangeTypeLoading] = useState(false);

  // Activity log
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Visits
  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  // Inline profile editing
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpdateMemberInput>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  // Card print
  const [cardSide, setCardSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [printing, setPrinting] = useState(false);

  const loadMember = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await membersApi.getById(id);
      setMember(data.data);
    } catch {
      setLoadError(true);
      toast.error('Gagal memuat data member');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadActivityLogs = useCallback(async () => {
    if (!id || !canViewActivity) {
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    try {
      const { data } = await activityLogApi.getByMemberId(id);
      setActivityLogs(data.data);
    } catch {
      toast.error('Gagal memuat riwayat aktivitas');
    } finally {
      setLogsLoading(false);
    }
  }, [id, canViewActivity]);

  const loadVisits = useCallback(async () => {
    if (!id || !canViewVisits) {
      setVisitsLoading(false);
      return;
    }
    setVisitsLoading(true);
    try {
      const { data } = await visitsApi.byMember(id);
      setVisits(data.data);
    } catch {
      toast.error('Gagal memuat riwayat kunjungan');
    } finally {
      setVisitsLoading(false);
    }
  }, [id, canViewVisits]);

  useEffect(() => {
    loadMember();
    loadActivityLogs();
    loadVisits();
  }, [loadMember, loadActivityLogs, loadVisits]);

  useEffect(() => {
    companiesApi
      .list()
      .then((res) => setCompanies(res.data.data.filter((c) => c.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat data perusahaan'));
  }, []);

  const startEditing = () => {
    if (!member) return;
    setForm({
      fullName: member.fullName,
      // NIK is not returned by the API: the field starts empty, and only a
      // value the operator types replaces the stored hash.
      nik: '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      dateOfBirth: toDateInputValue(member.dateOfBirth),
      companyId: member.companyId || '',
    });
    clearAll();
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    clearAll();
  };

  const handleProfileChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    clearAll();

    if (!validate(updateMemberSchema, form)) return;

    setSaving(true);
    try {
      // An empty NIK means "unchanged": drop it so the backend keeps the hash.
      const { nik, ...rest } = form;
      await membersApi.update(id, nik ? { ...rest, nik } : rest);
      toast.success('Member updated successfully');
      setEditing(false);
      await loadMember();
      await loadActivityLogs();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Gagal memperbarui member';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'renew') {
        await membershipsApi.renew(confirmAction.targetId, { startDate: new Date().toISOString() });
        toast.success('Membership renewed');
      }
      if (confirmAction.type === 'suspend') {
        await membershipsApi.suspend(confirmAction.targetId);
        toast.success('Membership ditangguhkan');
      }
      if (confirmAction.type === 'cancel') {
        await membershipsApi.cancel(confirmAction.targetId);
        toast.success('Membership cancelled');
      }
      if (confirmAction.type === 'deactivate') {
        await membersApi.deactivate(confirmAction.targetId);
        toast.success('Member deactivated');
      }
      if (confirmAction.type === 'activate') {
        await membersApi.activate(confirmAction.targetId);
        toast.success('Member activated');
      }
      if (confirmAction.type === 'delete') {
        await membersApi.remove(confirmAction.targetId);
        toast.success('Member dihapus');
        navigate('/members');
        return;
      }
      await loadMember();
      await loadActivityLogs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menjalankan aksi'));
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const openChangeType = async () => {
    try {
      const { data } = await membershipTypesApi.list();
      setMembershipTypes(data.data.filter((t) => t.status === 'ACTIVE'));
      setNewTypeId('');
      setShowChangeType(true);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal memuat tipe membership'));
    }
  };

  const handleChangeType = async () => {
    if (!newTypeId || !currentMembership) return;
    setChangeTypeLoading(true);
    try {
      await membershipsApi.changeType(currentMembership.id, { membershipTypeId: newTypeId });
      toast.success('Membership type changed');
      setShowChangeType(false);
      await loadMember();
      await loadActivityLogs();
    } catch {
      toast.error('Gagal mengubah tipe membership');
    } finally {
      setChangeTypeLoading(false);
    }
  };

  if (loading)
    return <div className="h-32 bg-surface rounded-[4px] border border-border animate-pulse" />;
  if (!member) {
    return (
      <div>
        <PageHeader title="Member" backTo="/members" />
        <Card>
          {loadError ? (
            <EmptyState
              title="Gagal memuat member"
              description="Terjadi kesalahan saat mengambil data. Silakan coba lagi."
            />
          ) : (
            <EmptyState
              title="Member tidak ditemukan"
              description="Data member mungkin telah dihapus atau tautannya salah."
            />
          )}
        </Card>
      </div>
    );
  }

  const currentMembership = member.memberships?.[0];
  const currentCard = currentMembership?.cards?.[0];

  const openEditDates = () => {
    if (!currentMembership) return;
    setDatesForm({
      startDate: toDateInputValue(currentMembership.startDate),
      endDate: toDateInputValue(currentMembership.endDate),
    });
    setDatesError('');
    setShowEditDates(true);
  };

  /**
   * Expiry preview. An empty end date means "recompute from the type duration",
   * exactly what the API does when the field is left blank, so the operator sees
   * the value that will actually be saved.
   */
  const datesPreviewEnd = (() => {
    if (!currentMembership || !datesForm.startDate) return null;
    if (datesForm.endDate) return new Date(datesForm.endDate);
    return addDays(new Date(datesForm.startDate), currentMembership.membershipType.duration);
  })();

  const handleSaveDates = async () => {
    if (!currentMembership) return;
    setDatesError('');

    if (!datesForm.startDate) {
      setDatesError('Tanggal mulai wajib diisi');
      return;
    }
    if (datesPreviewEnd && datesPreviewEnd.getTime() <= new Date(datesForm.startDate).getTime()) {
      setDatesError('Tanggal berakhir harus setelah tanggal mulai');
      return;
    }

    setDatesLoading(true);
    try {
      await membershipsApi.updateDates(currentMembership.id, {
        startDate: datesForm.startDate,
        // Blank = let the API apply the type's duration.
        endDate: datesForm.endDate || undefined,
      });
      toast.success('Tanggal membership diperbarui');
      setShowEditDates(false);
      await loadMember();
      await loadActivityLogs();
    } catch (err) {
      setDatesError(getErrorMessage(err, 'Gagal mengubah tanggal membership'));
    } finally {
      setDatesLoading(false);
    }
  };

  const handlePrintCard = async () => {
    if (!currentMembership || !currentCard?.cardTemplate) return;
    setPrinting(true);
    try {
      // Printed from the same renderer as the PDF export, so front and back
      // match the on-screen preview and come out at true card size.
      await printCard({
        id: currentCard.id,
        membershipId: currentCard.membershipId,
        cardNumber: currentCard.cardNumber,
        cardTemplateId: currentCard.cardTemplateId,
        templateVersion: currentCard.templateVersion,
        issuedAt: currentCard.issuedAt,
        createdAt: currentCard.createdAt,
        membership: {
          id: currentMembership.id,
          memberId: member.id,
          startDate: currentMembership.startDate,
          endDate: currentMembership.endDate,
          status: currentMembership.status,
          member: {
            id: member.id,
            memberNumber: member.memberNumber,
            nikLast4: member.nikLast4,
            qrHash: member.qrHash,
            fullName: member.fullName,
            photo: member.photo,
          },
          membershipType: currentMembership.membershipType,
        },
        cardTemplate: currentCard.cardTemplate,
      });
    } catch {
      toast.error('Gagal menyiapkan kartu untuk dicetak');
    } finally {
      setPrinting(false);
    }
  };

  const historyColumns = [
    { key: 'type', header: 'Type', render: (ms: Membership) => ms.membershipType.name },
    {
      key: 'period',
      header: 'Period',
      render: (ms: Membership) => (
        <span className="text-secondary">
          {formatDate(ms.startDate)} — {formatDate(ms.endDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ms: Membership) => <StatusBadge status={ms.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={member.fullName}
        description={member.memberNumber}
        backTo="/members"
        action={
          canManageMember || canDeleteMember ? (
            <div className="flex gap-2">
              {canManageMember &&
                (member.status === 'ACTIVE' ? (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmAction({ type: 'deactivate', targetId: member.id })}
                  >
                    Nonaktifkan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmAction({ type: 'activate', targetId: member.id })}
                  >
                    Aktifkan
                  </Button>
                ))}
              {canDeleteMember && (
                <Button
                  variant="danger"
                  onClick={() => setConfirmAction({ type: 'delete', targetId: member.id })}
                >
                  Hapus Member
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Profile */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3>Profile</h3>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={startEditing}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3">
                  <Input
                    label="Full Name"
                    value={form.fullName || ''}
                    onChange={(e) => handleProfileChange('fullName', e.target.value)}
                    error={fieldErrors.fullName}
                    disabled={saving}
                    required
                  />
                  <Input
                    label="NIK (kosongkan bila tidak diubah)"
                    value={form.nik || ''}
                    onChange={(e) => handleProfileChange('nik', e.target.value)}
                    error={fieldErrors.nik}
                    disabled={saving}
                    maxLength={16}
                    helper={
                      member.nikLast4
                        ? `Tersimpan: ••••••••••••${member.nikLast4}`
                        : 'Belum ada NIK tersimpan'
                    }
                  />
                  <Input
                    label="Phone"
                    value={form.phone || ''}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    error={fieldErrors.phone}
                    disabled={saving}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email || ''}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    error={fieldErrors.email}
                    disabled={saving}
                  />
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={form.dateOfBirth || ''}
                    onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                    disabled={saving}
                  />
                  <Select
                    label="Company"
                    options={companies.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="No company"
                    value={form.companyId || ''}
                    onChange={(e) => handleProfileChange('companyId', e.target.value)}
                    disabled={saving}
                  />
                  <Input
                    label="Address"
                    value={form.address || ''}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    disabled={saving}
                  />
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 bg-danger/10 text-danger text-[12px] px-3 py-2 rounded-[4px] border border-danger/20"
                  >
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    disabled={saving}
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" type="submit" loading={saving}>
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5 text-[13px]">
                <div>
                  <span className="text-muted">Name:</span>{' '}
                  <span className="font-medium">{member.fullName}</span>
                </div>
                <div>
                  <span className="text-muted">No:</span>{' '}
                  <span className="font-mono">{member.memberNumber}</span>
                </div>
                <div>
                  <span className="text-muted">NIK:</span>{' '}
                  <span className="font-mono">
                    {member.nikLast4 ? `••••••••••••${member.nikLast4}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Phone:</span> {member.phone || '-'}
                </div>
                <div>
                  <span className="text-muted">Email:</span> {member.email || '-'}
                </div>
                <div>
                  <span className="text-muted">Born:</span>{' '}
                  {member.dateOfBirth ? formatDate(member.dateOfBirth) : '-'}
                </div>
                <div>
                  <span className="text-muted">Company:</span> {member.company?.name || '-'}
                </div>
                <div>
                  <span className="text-muted">Address:</span> {member.address || '-'}
                </div>
                <div>
                  <span className="text-muted">Status:</span> <StatusBadge status={member.status} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership */}
        <Card>
          <CardHeader>
            <h3>Membership</h3>
          </CardHeader>
          <CardContent>
            {currentMembership ? (
              <div className="space-y-2.5 text-[13px]">
                <div>
                  <span className="text-muted">Type:</span>{' '}
                  <span className="font-medium">{currentMembership.membershipType.name}</span>
                </div>
                <div>
                  <span className="text-muted">Status:</span>{' '}
                  <StatusBadge status={currentMembership.status} />
                </div>
                <div>
                  <span className="text-muted">Start:</span>{' '}
                  {formatDate(currentMembership.startDate)}
                </div>
                <div>
                  <span className="text-muted">End:</span> {formatDate(currentMembership.endDate)}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {/* Editing the period is allowed on any membership that is
                      not cancelled; the other lifecycle actions need ACTIVE. */}
                  {currentMembership.status !== 'CANCELLED' && (
                    <Button size="sm" variant="secondary" onClick={openEditDates}>
                      <CalendarClock className="w-3 h-3" /> Ubah Tanggal
                    </Button>
                  )}
                  {currentMembership.status === 'ACTIVE' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={openChangeType}>
                        <ArrowRightLeft className="w-3 h-3" /> Change Type
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setConfirmAction({ type: 'renew', targetId: currentMembership.id })
                        }
                      >
                        <RotateCcw className="w-3 h-3" /> Renew
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setConfirmAction({ type: 'suspend', targetId: currentMembership.id })
                        }
                      >
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setConfirmAction({ type: 'cancel', targetId: currentMembership.id })
                        }
                      >
                        <Ban className="w-3 h-3" /> Batalkan
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">Belum ada membership</p>
            )}
          </CardContent>
        </Card>

        {/* Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3>Card</h3>
            {currentCard && (
              <div className="flex gap-1">
                {(['FRONT', 'BACK'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setCardSide(side)}
                    className={`px-2 py-1 text-[12px] font-medium rounded-[4px] transition-colors ${cardSide === side ? 'bg-brand text-white' : 'text-secondary hover:text-foreground hover:bg-bg'}`}
                  >
                    {side === 'FRONT' ? 'Front' : 'Back'}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {currentCard ? (
              <div className="space-y-3">
                <div className="text-[13px] space-y-2.5">
                  <div>
                    <span className="text-muted">Card No:</span>{' '}
                    <span className="font-mono">{currentCard.cardNumber}</span>
                  </div>
                  <div>
                    <span className="text-muted">Template:</span>{' '}
                    {currentCard.cardTemplate?.name || '-'} (v{currentCard.templateVersion})
                  </div>
                  <div>
                    <span className="text-muted">Issued:</span> {formatDate(currentCard.issuedAt)}
                  </div>
                </div>
                {currentCard.cardTemplate && (
                  <>
                    <div className="flex justify-center">
                      <CardPreview
                        card={{
                          id: currentCard.id,
                          membershipId: currentCard.membershipId,
                          cardNumber: currentCard.cardNumber,
                          cardTemplateId: currentCard.cardTemplateId,
                          templateVersion: currentCard.templateVersion,
                          issuedAt: currentCard.issuedAt,
                          createdAt: currentCard.createdAt,
                          membership: {
                            id: currentMembership.id,
                            memberId: member.id,
                            startDate: currentMembership.startDate,
                            endDate: currentMembership.endDate,
                            status: currentMembership.status,
                            member: {
                              id: member.id,
                              memberNumber: member.memberNumber,
                              nikLast4: member.nikLast4,
                              qrHash: member.qrHash,
                              fullName: member.fullName,
                              photo: member.photo,
                            },
                            membershipType: currentMembership.membershipType,
                          },
                          cardTemplate: currentCard.cardTemplate,
                        }}
                        side={cardSide}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={handlePrintCard}
                      loading={printing}
                    >
                      <Printer className="w-3 h-3" /> Cetak Kartu
                    </Button>
                  </>
                )}

                {/* Renew/change-type issue a new card on the same membership, so
                    older cards stay here as history instead of a separate page. */}
                {currentMembership.cards.length > 1 && (
                  <div className="pt-1">
                    <p className="text-[12px] font-medium text-muted mb-2">Riwayat Kartu</p>
                    <div className="divide-y divide-border text-[12px]">
                      {currentMembership.cards.map((c, index) => (
                        <div key={c.id} className="flex items-center justify-between py-1.5 gap-3">
                          <span className="font-mono flex items-center gap-2">
                            {c.cardNumber}
                            {index === 0 && (
                              <span className="font-sans text-[11px] text-success">Aktif</span>
                            )}
                          </span>
                          <span className="text-muted truncate">
                            {c.cardTemplate?.name || '-'} (v{c.templateVersion})
                          </span>
                          <span className="text-secondary shrink-0">{formatDate(c.issuedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted">No card</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      {canViewActivity && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3>Riwayat Aktivitas</h3>
            <span className="text-[12px] text-muted">{activityLogs.length} entries</span>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="px-5 py-4">
                <div className="h-20 bg-bg rounded-[4px] animate-pulse" />
              </div>
            ) : activityLogs.length === 0 ? (
              <p className="text-[13px] text-muted px-5 py-4 text-center">No activity yet</p>
            ) : (
              <div className="divide-y divide-border">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${ACTION_COLORS[log.action] || 'bg-bg text-muted'}`}
                    >
                      {ACTION_ICONS[log.action] || <Clock className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground">{log.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted">{log.officer.name}</span>
                        <span className="text-[11px] text-muted">•</span>
                        <span className="text-[11px] text-muted">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Riwayat Kunjungan */}
      {canViewVisits && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3>Riwayat Kunjungan</h3>
            <span className="text-[12px] text-muted">{visits.length} kunjungan</span>
          </CardHeader>
          <CardContent className="p-0">
            {visitsLoading ? (
              <div className="px-5 py-4">
                <div className="h-16 bg-bg rounded-[4px] animate-pulse" />
              </div>
            ) : visits.length === 0 ? (
              <p className="text-[13px] text-muted px-5 py-4 text-center">Belum ada kunjungan</p>
            ) : (
              <div className="divide-y divide-border">
                {visits.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2 text-[13px] text-foreground">
                      <Clock className="w-3.5 h-3.5 text-muted" />
                      {formatDateTime(v.createdAt)}
                    </div>
                    <span className="text-[11px] text-muted">{v.officer?.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Membership History */}
      <Card className="mt-6">
        <CardHeader>
          <h3>Riwayat Membership</h3>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={historyColumns}
            data={member.memberships}
            emptyTitle="No history"
            getRowId={(ms: Membership) => ms.id}
            pageSize={5}
          />
        </CardContent>
      </Card>

      {/* Edit Membership Dates Modal */}
      <Modal
        open={showEditDates}
        onClose={() => setShowEditDates(false)}
        title="Ubah Tanggal Membership"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-secondary">
            Mengubah periode membership yang sedang aktif. Nomor kartu tetap, tidak ada kartu baru
            yang diterbitkan.
          </p>
          <Input
            label="Tanggal Mulai"
            type="date"
            value={datesForm.startDate}
            onChange={(e) => {
              setDatesForm((prev) => ({ ...prev, startDate: e.target.value }));
              setDatesError('');
            }}
            required
          />
          <Input
            label="Tanggal Berakhir"
            type="date"
            value={datesForm.endDate}
            onChange={(e) => {
              setDatesForm((prev) => ({ ...prev, endDate: e.target.value }));
              setDatesError('');
            }}
            helper={`Kosongkan untuk memakai durasi tipe (${currentMembership?.membershipType.duration ?? 0} hari).`}
          />
          {datesPreviewEnd && (
            <div className="bg-bg rounded-[4px] px-4 py-3 text-[13px]">
              <span className="text-secondary">Berakhir: </span>
              <span className="font-medium">{formatDate(datesPreviewEnd)}</span>
              {!datesForm.endDate && <span className="text-muted"> (otomatis)</span>}
            </div>
          )}
          {datesError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{datesError}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowEditDates(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveDates} loading={datesLoading}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Type Modal */}
      <Modal
        open={showChangeType}
        onClose={() => setShowChangeType(false)}
        title="Change Membership Type"
      >
        <div className="space-y-4">
          <p className="text-[13px] text-secondary">
            Change from{' '}
            <span className="font-medium text-foreground">
              {currentMembership?.membershipType.name}
            </span>{' '}
            to a new type. The card will be reissued with the new template.
          </p>
          <Select
            label="New Membership Type"
            options={membershipTypes
              .filter((t) => t.id !== currentMembership?.membershipTypeId)
              .map((t) => ({ value: t.id, label: `${t.name} (${t.duration} days)` }))}
            placeholder="Select new type"
            value={newTypeId}
            onChange={(e) => setNewTypeId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowChangeType(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeType} loading={changeTypeLoading} disabled={!newTypeId}>
              Change Type
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={
          confirmAction?.type === 'deactivate'
            ? 'Nonaktifkan Member'
            : confirmAction?.type === 'activate'
              ? 'Aktifkan Member'
              : confirmAction?.type === 'delete'
                ? 'Hapus Member'
                : 'Konfirmasi Aksi'
        }
        description={
          confirmAction?.type === 'deactivate'
            ? 'Member ini akan ditandai tidak aktif dan tidak dapat diverifikasi.'
            : confirmAction?.type === 'activate'
              ? 'Member ini akan diaktifkan kembali dan dapat diverifikasi.'
              : confirmAction?.type === 'delete'
                ? `${member.fullName} akan dihapus dan tidak muncul lagi di daftar maupun scanner. Riwayat kunjungan dan scan tetap tersimpan, dan member bisa dipulihkan lewat "Tampilkan yang terhapus".`
                : `Yakin ingin melanjutkan aksi ini pada membership?`
        }
        confirmLabel={
          confirmAction?.type === 'deactivate'
            ? 'Nonaktifkan'
            : confirmAction?.type === 'activate'
              ? 'Aktifkan'
              : confirmAction?.type === 'delete'
                ? 'Hapus'
                : confirmAction?.type === 'cancel'
                  ? 'Ya, lanjutkan'
                  : 'Ya'
        }
        variant={
          confirmAction?.type === 'cancel' ||
          confirmAction?.type === 'deactivate' ||
          confirmAction?.type === 'delete'
            ? 'danger'
            : 'primary'
        }
        loading={actionLoading}
      />
    </div>
  );
}
