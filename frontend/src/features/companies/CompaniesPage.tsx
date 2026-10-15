import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companiesApi } from './api';
import type { Company, CreateCompanyInput } from './types';
import { companySchema } from '@/features/members/validation';
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
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toast-store';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggleTarget, setToggleTarget] = useState<Company | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await companiesApi.list();
      setCompanies(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat data perusahaan');
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
        await companiesApi.deactivate(toggleTarget.id);
        toast.success('Company deactivated');
      } else {
        await companiesApi.activate(toggleTarget.id);
        toast.success('Company activated');
      }
      await load();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  };

  const filteredCompanies = companies
    .filter((c) => !statusFilter || c.status === statusFilter)
    .filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()),
    );

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (c: Company) => <span className="font-mono">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Company',
      render: (c: Company) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="text-[12px] text-muted">{c.address || '-'}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c: Company) => (
        <div className="text-secondary">
          <div>{c.phone || '-'}</div>
          <div className="text-[12px] text-muted">{c.email || '-'}</div>
        </div>
      ),
    },
    {
      key: 'members',
      header: 'Members',
      render: (c: Company) => <span className="text-secondary">{c._count?.members ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: Company) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (c: Company) => (
        <RowActions
          actions={[
            {
              key: 'edit',
              label: 'Edit company',
              variant: 'brand',
              onClick: () => navigate(`/companies/${c.id}/edit`),
            },
            {
              key: 'toggle',
              label: c.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan',
              variant: c.status === 'ACTIVE' ? 'danger' : 'default',
              onClick: () => setToggleTarget(c),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Manage member companies"
        action={
          <Button onClick={() => navigate('/companies/new')}>
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        }
      />
      <Card>
        <TableToolbar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or code..."
          />
          <div className="w-40">
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </TableToolbar>
        <ListCapNotice meta={meta} />
        <DataTable
          columns={columns}
          data={filteredCompanies}
          loading={loading}
          emptyTitle="No companies"
          emptyDescription="Create a company to assign members to"
          emptyAction={
            <Button onClick={() => navigate('/companies/new')}>
              <Plus className="w-4 h-4" /> Add Company
            </Button>
          }
          getRowId={(c) => c.id}
        />
      </Card>

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'ACTIVE' ? 'Deactivate Company' : 'Activate Company'}
        description={
          toggleTarget?.status === 'ACTIVE'
            ? `${toggleTarget.name} akan ditandai tidak aktif dan tidak dapat dipilih untuk member baru.`
            : `${toggleTarget?.name ?? 'Company'} akan diaktifkan kembali dan dapat digunakan lagi.`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={toggleLoading}
      />
    </div>
  );
}

export function CompanyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const [form, setForm] = useState<CreateCompanyInput>({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  useEffect(() => {
    if (!isNew && id) {
      companiesApi
        .getById(id)
        .then((res) => {
          const c = res.data.data;
          setForm({
            code: c.code,
            name: c.name,
            address: c.address || '',
            phone: c.phone || '',
            email: c.email || '',
            status: c.status,
          });
          setStatus(c.status || 'ACTIVE');
        })
        .catch(() => toast.error('Gagal memuat data perusahaan'));
    }
  }, [id, isNew]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleToggleStatus = async () => {
    if (!id || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'deactivate') {
        await companiesApi.deactivate(id);
        setStatus('INACTIVE');
        toast.success('Company deactivated');
      } else {
        await companiesApi.activate(id);
        setStatus('ACTIVE');
        toast.success('Company activated');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();

    if (!validate(companySchema, form)) return;

    setSaving(true);
    try {
      if (isNew) await companiesApi.create(form);
      else await companiesApi.update(id!, form);
      toast.success(isNew ? 'Company created' : 'Company updated');
      navigate('/companies');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Failed to save company';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'Add Company' : 'Edit Company'}
        backTo="/companies"
        action={
          !isNew ? (
            <div className="flex gap-2 items-center">
              <StatusBadge status={status} />
              {status === 'ACTIVE' ? (
                <Button variant="danger" size="sm" onClick={() => setConfirmAction('deactivate')}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('activate')}>
                  Activate
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <h3>Company Information</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Input
                label="Code"
                value={form.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="BROS"
                error={fieldErrors.code}
                disabled={saving}
                required
              />
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Bros Hospital"
                error={fieldErrors.name}
                disabled={saving}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@company.com"
                error={fieldErrors.email}
                disabled={saving}
              />
              <Input
                label="Phone"
                value={form.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="021-xxxxxxx"
                error={fieldErrors.phone}
                disabled={saving}
              />
              <Input
                label="Address"
                value={form.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address"
                disabled={saving}
                className="sm:col-span-2"
              />
            </div>
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
            onClick={() => navigate('/companies')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleToggleStatus}
        title={confirmAction === 'deactivate' ? 'Deactivate Company' : 'Activate Company'}
        description={
          confirmAction === 'deactivate'
            ? 'This company will be marked as inactive and cannot be selected for new members.'
            : 'This company will be reactivated and can be used for new members again.'
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Deactivate' : 'Activate'}
        variant={confirmAction === 'deactivate' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}
