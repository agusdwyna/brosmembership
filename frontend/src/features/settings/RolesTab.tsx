import { useEffect, useState } from 'react';
import { rolesApi } from './api';
import type { Role } from './types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable } from '@/components/shared/DataTable';
import { TableToolbar, SearchInput } from '@/components/shared/TableToolbar';
import { RowActions } from '@/components/shared/RowActions';
import { getErrorMessage } from '@/lib/error';
import { toast } from '@/components/ui/toast-store';
import { PERMISSION_CATALOG, permissionKey } from '@/lib/permissions';
import { AlertCircle, Plus } from 'lucide-react';

export function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await rolesApi.list();
      setRoles(data.data);
    } catch {
      toast.error('Gagal memuat daftar role');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesApi.remove(deleteTarget.id);
      toast.success('Role dihapus');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghapus role'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = roles.filter(
    (r) =>
      !search ||
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.key.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    {
      key: 'label',
      header: 'Role',
      render: (r: Role) => <span className="font-medium">{r.label}</span>,
    },
    {
      key: 'key',
      header: 'Kode',
      render: (r: Role) => <span className="font-mono text-secondary">{r.key}</span>,
    },
    {
      key: 'permissions',
      header: 'Permission',
      render: (r: Role) => <span className="text-secondary">{r.permissions.length} hak akses</span>,
    },
    {
      key: 'type',
      header: 'Tipe',
      render: (r: Role) =>
        r.isSystem ? <Badge variant="info">Bawaan</Badge> : <Badge>Kustom</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-[1%]',
      render: (r: Role) => (
        <RowActions
          actions={[
            { key: 'edit', label: 'Atur akses', variant: 'brand', onClick: () => setEditRole(r) },
            {
              key: 'delete',
              label: 'Hapus',
              variant: 'danger',
              disabled: r.isSystem,
              onClick: () => setDeleteTarget(r),
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
          <SearchInput value={search} onChange={setSearch} placeholder="Cari role..." />
          <div className="ml-auto">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Tambah Role
            </Button>
          </div>
        </TableToolbar>

        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyTitle="Belum ada role"
          emptyDescription="Tambahkan role untuk mengatur hak akses pengguna."
          getRowId={(r) => r.id}
        />
      </Card>

      <RoleFormModal
        open={createOpen}
        role={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          load();
        }}
      />

      {editRole && (
        <RoleFormModal
          open
          role={editRole}
          onClose={() => setEditRole(null)}
          onSaved={() => {
            setEditRole(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Role"
        description={`Role ${deleteTarget?.label ?? ''} akan dihapus permanen. Role yang masih dipakai user tidak bisa dihapus.`}
        confirmLabel="Hapus"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function RoleFormModal({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !role;
  const [form, setForm] = useState({
    key: role?.key ?? '',
    label: role?.label ?? '',
    description: role?.description ?? '',
  });
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key: string) => {
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
    if (error) setError('');
  };

  const toggleModule = (keys: string[], allSelected: boolean) => {
    setPermissions((prev) =>
      allSelected ? prev.filter((p) => !keys.includes(p)) : Array.from(new Set([...prev, ...keys])),
    );
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew && !/^[A-Z][A-Z0-9_]*$/.test(form.key)) {
      setError('Kode hanya boleh huruf kapital, angka, dan underscore (mis. SUPERVISOR).');
      return;
    }
    if (form.label.trim().length < 2) {
      setError('Nama minimal 2 karakter.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await rolesApi.create({
          key: form.key,
          label: form.label.trim(),
          description: form.description.trim() || undefined,
          permissions,
        });
        toast.success('Role dibuat');
      } else {
        await rolesApi.update(role!.id, {
          label: form.label.trim(),
          description: form.description.trim(),
          permissions,
        });
        toast.success('Role diperbarui');
      }
      onSaved();
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan role');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Tambah Role' : 'Atur Akses Role'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Kode"
            value={form.key}
            onChange={(e) => {
              setForm({ ...form, key: e.target.value.toUpperCase() });
              if (error) setError('');
            }}
            placeholder="SUPERVISOR"
            helper={
              isNew ? 'Kode unik, tidak bisa diubah setelah dibuat.' : 'Kode tidak bisa diubah.'
            }
            disabled={!isNew || saving}
            required
          />
          <Input
            label="Nama"
            value={form.label}
            onChange={(e) => {
              setForm({ ...form, label: e.target.value });
              if (error) setError('');
            }}
            placeholder="Supervisor"
            disabled={saving}
            required
          />
        </div>
        <Input
          label="Deskripsi"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Deskripsi singkat role"
          disabled={saving}
        />

        <div className="space-y-3">
          <div className="text-[13px] font-medium text-foreground">Hak Akses</div>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {PERMISSION_CATALOG.map((mod) => {
              const moduleKeys = mod.actions.map((a) => permissionKey(mod.module, a.key));
              const selectedCount = moduleKeys.filter((k) => permissions.includes(k)).length;
              const allSelected = selectedCount === moduleKeys.length;
              const someSelected = selectedCount > 0 && !allSelected;
              return (
                <div key={mod.module} className="border border-border rounded-[4px] p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-[13px] font-medium text-foreground">{mod.label}</div>
                    <label className="flex items-center gap-2 text-[12px] text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={() => toggleModule(moduleKeys, allSelected)}
                        disabled={saving}
                        className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                      />
                      Pilih semua
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {mod.actions.map((action) => {
                      const key = permissionKey(mod.module, action.key);
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-[13px] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={permissions.includes(key)}
                            onChange={() => toggle(key)}
                            disabled={saving}
                            className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                          />
                          {action.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-danger/10 text-danger text-[13px] px-4 py-3 rounded-[4px] border border-danger/20"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
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
