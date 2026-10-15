import { useEffect, useState } from 'react';
import { z } from 'zod';
import { usersApi } from './api';
import type { AppUser } from './types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { ListCapNotice } from '@/components/shared/ListCapNotice';
import type { ListMeta } from '@/lib/list';
import { useFormErrors } from '@/lib/use-form-error';
import { getErrorMessage } from '@/lib/error';
import { toast } from '@/components/ui/toast-store';
import { useAuthStore } from '@/stores/auth-store';
import { AlertCircle, Plus } from 'lucide-react';

const roleOptions = [
  { value: 'OFFICER', label: 'Officer' },
  { value: 'ADMIN', label: 'Admin' },
];

const createSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'OFFICER']),
});

const editSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['ADMIN', 'OFFICER']),
});

export function UsersTab() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [meta, setMeta] = useState<ListMeta>();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AppUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.list();
      setUsers(data.data);
      setMeta(data.meta);
    } catch {
      toast.error('Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setActionLoading(true);
    try {
      if (toggleTarget.status === 'ACTIVE') {
        await usersApi.deactivate(toggleTarget.id);
        toast.success('Pengguna dinonaktifkan');
      } else {
        await usersApi.activate(toggleTarget.id);
        toast.success('Pengguna diaktifkan');
      }
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mengubah status'));
    } finally {
      setActionLoading(false);
      setToggleTarget(null);
    }
  };

  const filtered = users
    .filter((u) => !roleFilter || u.role === roleFilter)
    .filter((u) => !statusFilter || u.status === statusFilter)
    .filter(
      (u) =>
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );

  const columns = [
    {
      key: 'name',
      header: 'Nama',
      render: (u: AppUser) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{u.name}</span>
          {u.id === currentUser?.id && <Badge variant="info">Anda</Badge>}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (u: AppUser) => <span className="text-secondary">{u.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: AppUser) => (
        <Badge variant={u.role === 'ADMIN' ? 'warning' : 'default'}>{u.role}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: AppUser) => <StatusBadge status={u.status} />,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (u: AppUser) => (
        <RowActions
          actions={[
            { key: 'edit', label: 'Edit', variant: 'brand', onClick: () => setEditUser(u) },
            { key: 'reset', label: 'Reset Password', onClick: () => setResetUser(u) },
            {
              key: 'toggle',
              label: u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan',
              variant: u.status === 'ACTIVE' ? 'danger' : 'default',
              onClick: () => setToggleTarget(u),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <Card>
        <TableToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau email..." />
          <div className="w-36">
            <Select
              options={[{ value: '', label: 'Semua Role' }, ...roleOptions]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>
          <div className="w-36">
            <Select
              options={[
                { value: '', label: 'Semua Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="ml-auto">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Tambah Pengguna
            </Button>
          </div>
        </TableToolbar>

        <ListCapNotice meta={meta} />

        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="Belum ada pengguna"
          emptyDescription="Tambahkan pengguna untuk memberikan akses."
          getRowId={(u) => u.id}
        />
      </Card>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            load();
          }}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSaved={() => setResetUser(null)}
        />
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
        title={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
        description={
          toggleTarget?.status === 'ACTIVE'
            ? `${toggleTarget?.name} tidak akan bisa login lagi.`
            : `${toggleTarget?.name ?? 'Pengguna'} akan bisa login kembali.`
        }
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={toggleTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}

function CreateUserModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OFFICER' as const });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();
    if (!validate(createSchema, form)) return;

    setSaving(true);
    try {
      await usersApi.create(form);
      toast.success('Pengguna dibuat');
      onSaved();
      setForm({ name: '', email: '', password: '', role: 'OFFICER' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal membuat pengguna');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tambah Pengguna">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={fieldErrors.name}
          disabled={saving}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={fieldErrors.email}
          disabled={saving}
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={fieldErrors.password}
          disabled={saving}
          required
        />
        <Select
          label="Role"
          options={roleOptions}
          value={form.role}
          onChange={(e) => handleChange('role', e.target.value)}
          disabled={saving}
        />

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();
    if (!validate(editSchema, form)) return;

    setSaving(true);
    try {
      await usersApi.update(
        user.id,
        form as { name: string; email: string; role: 'ADMIN' | 'OFFICER' },
      );
      toast.success('Pengguna diperbarui');
      onSaved();
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal memperbarui pengguna');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit Pengguna">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={fieldErrors.name}
          disabled={saving}
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={fieldErrors.email}
          disabled={saving}
          required
        />
        <Select
          label="Role"
          options={roleOptions}
          value={form.role}
          onChange={(e) => handleChange('role', e.target.value)}
          disabled={saving}
        />

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setSaving(true);
    try {
      await usersApi.resetPassword(user.id, password);
      toast.success('Password direset');
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal mereset password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Reset Password — ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Password Baru"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          error={error}
          disabled={saving}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            Reset
          </Button>
        </div>
      </form>
    </Modal>
  );
}
