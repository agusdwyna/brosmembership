import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { AlertCircle, Save, KeyRound } from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import { useFormErrors } from '@/lib/use-form-error';
import { getErrorMessage } from '@/lib/error';
import { toast } from '@/components/ui/toast-store';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
});

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  const handleChange = (field: 'name' | 'email', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();
    if (!validate(profileSchema, form)) return;

    setSaving(true);
    try {
      const { data } = await authApi.updateMe(form);
      setUser(data.data);
      toast.success('Profil diperbarui');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal menyimpan profil');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil"
        description="Kelola informasi akun Anda"
        action={
          <Button variant="secondary" onClick={() => navigate('/profile/password')}>
            <KeyRound className="w-4 h-4" /> Ganti Password
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-[15px] font-semibold">Informasi Akun</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
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
            </div>
            <Input
              label="Role"
              value={user?.role ?? ''}
              disabled
              helper="Role hanya bisa diubah oleh admin."
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" /> Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
