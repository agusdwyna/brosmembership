import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { membershipTypesApi } from './api';
import { cardTemplatesApi } from '@/features/card-templates/api';
import type { CardTemplate } from '@/features/card-templates/types';
import type { MembershipType, CreateMembershipTypeInput } from './types';
import { membershipTypeSchema } from '@/features/members/validation';
import { useFormErrors } from '@/lib/use-form-error';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { TemplateThumbnail } from '@/features/card-templates/components/TemplateThumbnail';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toast-store';

export function MembershipTypesPage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggleTarget, setToggleTarget] = useState<MembershipType | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await membershipTypesApi.list();
      setTypes(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat tipe membership');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      if (toggleTarget.status === 'ACTIVE') {
        await membershipTypesApi.deactivate(toggleTarget.id);
        toast.success('Tipe membership dinonaktifkan');
      } else {
        await membershipTypesApi.activate(toggleTarget.id);
        toast.success('Membership type activated');
      }
      await load();
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  };

  const filteredTypes = types
    .filter((t) => !statusFilter || t.status === statusFilter)
    .filter(
      (t) =>
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()),
    );

  const columns = [
    {
      key: 'code',
      header: 'Kode',
      render: (t: MembershipType) => <span className="font-mono">{t.code}</span>,
    },
    {
      key: 'name',
      header: 'Nama',
      render: (t: MembershipType) => <span className="font-medium">{t.name}</span>,
    },
    { key: 'duration', header: 'Durasi', render: (t: MembershipType) => `${t.duration} hari` },
    {
      key: 'template',
      header: 'Template',
      render: (t: MembershipType) => (
        <span className="text-secondary">{t.defaultCardTemplate?.name || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: MembershipType) => <StatusBadge status={t.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (t: MembershipType) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: 'Ubah tipe',
              variant: 'brand',
              onClick: () => navigate(`/membership-types/${t.id}/edit`),
            },
            {
              key: 'toggle',
              label: t.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan',
              variant: t.status === 'ACTIVE' ? 'danger' : 'default',
              onClick: () => setToggleTarget(t),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tipe Membership"
        description="Kelola konfigurasi tipe membership"
        action={
          <Button onClick={() => navigate('/membership-types/new')}>
            <Plus className="w-4 h-4" /> Tambah Tipe
          </Button>
        }
      />
      <Card>
        <TableToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau kode..." />
          <div className="w-40">
            <Select
              options={[
                { value: '', label: 'Semua Status' },
                { value: 'ACTIVE', label: 'Aktif' },
                { value: 'INACTIVE', label: 'Nonaktif' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filteredTypes}
          loading={loading}
          emptyTitle="Belum ada tipe membership"
          emptyDescription="Tambahkan tipe membership untuk memulai"
          emptyAction={
            <Button onClick={() => navigate('/membership-types/new')}>
              <Plus className="w-4 h-4" /> Tambah Tipe
            </Button>
          }
          getRowId={(t) => t.id}
        />
      </Card>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={
          toggleTarget?.status === 'ACTIVE'
            ? 'Nonaktifkan Tipe Membership'
            : 'Aktifkan Tipe Membership'
        }
        description={
          toggleTarget?.status === 'ACTIVE'
            ? `${toggleTarget.name} akan ditandai tidak aktif dan tidak dapat dipilih untuk membership baru.`
            : `${toggleTarget?.name ?? 'Membership type'} akan diaktifkan kembali dan dapat digunakan lagi.`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={toggleLoading}
      />
    </div>
  );
}

export function MembershipTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const [form, setForm] = useState<CreateMembershipTypeInput>({
    code: '',
    name: '',
    description: '',
    duration: 365,
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  useEffect(() => {
    if (!isNew && id) {
      membershipTypesApi
        .getById(id)
        .then((res) => {
          const t = res.data.data;
          setForm({
            code: t.code,
            name: t.name,
            description: t.description || '',
            duration: t.duration,
            status: t.status,
            defaultCardTemplateId: t.defaultCardTemplateId || '',
          });
          setStatus(t.status || 'ACTIVE');
        })
        .catch(() => toast.error('Gagal memuat tipe membership'));
    }
  }, [id, isNew]);

  // Only active templates can be picked as a default for new memberships.
  useEffect(() => {
    cardTemplatesApi
      .list()
      .then((res) => setTemplates(res.data.data.filter((t) => t.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat template kartu'));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === form.defaultCardTemplateId);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleToggleStatus = async () => {
    if (!id || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'deactivate') {
        await membershipTypesApi.deactivate(id);
        setStatus('INACTIVE');
        toast.success('Tipe membership dinonaktifkan');
      } else {
        await membershipTypesApi.activate(id);
        setStatus('ACTIVE');
        toast.success('Membership type activated');
      }
    } catch {
      toast.error('Gagal mengubah status');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();

    if (!validate(membershipTypeSchema, form)) return;

    setSaving(true);
    try {
      if (isNew) await membershipTypesApi.create(form);
      else await membershipTypesApi.update(id!, form);
      toast.success(isNew ? 'Membership type created' : 'Membership type updated');
      navigate('/membership-types');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Gagal menyimpan tipe membership';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'Tambah Tipe Membership' : 'Ubah Tipe Membership'}
        backTo="/membership-types"
        action={
          !isNew ? (
            <div className="flex gap-2 items-center">
              <StatusBadge status={status} />
              {status === 'ACTIVE' ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmAction('deactivate')}>
                  Nonaktifkan
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('activate')}>
                  Aktifkan
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <h3>Membership Type Information</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Input
                label="Code"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="SILVER"
                error={fieldErrors.code}
                disabled={saving}
                required
              />
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Silver Membership"
                error={fieldErrors.name}
                disabled={saving}
                required
              />
              <Input
                label="Description"
                value={form.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Basic membership"
                disabled={saving}
                className="sm:col-span-2"
              />
              <Input
                label="Duration (days)"
                type="number"
                value={form.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
                error={fieldErrors.duration}
                disabled={saving}
                required
                min={1}
              />
              <div className="sm:col-span-2">
                <Select
                  label="Default Card Template"
                  options={templates.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="No template"
                  value={form.defaultCardTemplateId || ''}
                  onChange={(e) => handleChange('defaultCardTemplateId', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {selectedTemplate ? (
              <div className="mt-4">
                <div className="text-[13px] font-medium text-foreground mb-2">Template Preview</div>
                <div className="flex flex-wrap gap-4">
                  {(['FRONT', 'BACK'] as const).map((side) => (
                    <div key={side}>
                      <div className="text-[12px] text-muted mb-1.5">
                        {side === 'FRONT' ? 'Depan' : 'Belakang'}
                      </div>
                      <TemplateThumbnail template={selectedTemplate} side={side} width={300} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="text-[12px] text-muted mt-3">
              Kartu untuk membership ini akan dicetak dengan template tersebut. Jika dikosongkan,
              sistem memakai template aktif yang paling lama dibuat.
            </p>
          </CardContent>
        </Card>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            type="button"
            disabled={saving}
            onClick={() => navigate('/membership-types')}
          >
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Simpan
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleToggleStatus}
        title={
          confirmAction === 'deactivate'
            ? 'Nonaktifkan Tipe Membership'
            : 'Aktifkan Tipe Membership'
        }
        description={
          confirmAction === 'deactivate'
            ? 'This type will be marked as inactive and cannot be selected for new memberships.'
            : 'This type will be reactivated and can be used for new memberships again.'
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={confirmAction === 'deactivate' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}
