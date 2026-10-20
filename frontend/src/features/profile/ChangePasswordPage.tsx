import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { AlertCircle, KeyRound } from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { useFormErrors } from '@/lib/use-form-error';
import { getErrorMessage } from '@/lib/error';
import { toast } from '@/components/ui/toast-store';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password lama wajib diisi'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();
    if (!validate(changePasswordSchema, form)) return;

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password berhasil diubah');
      navigate('/profile');
    } catch (err) {
      const msg = getErrorMessage(err, 'Gagal mengubah password');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ganti Password" description="Ubah password akun Anda" backTo="/profile" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="text-[15px] font-semibold">Password</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Password Lama"
              type="password"
              value={form.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              error={fieldErrors.currentPassword}
              disabled={saving}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Input
                label="Password Baru"
                type="password"
                value={form.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                error={fieldErrors.newPassword}
                helper="Minimal 6 karakter."
                disabled={saving}
                required
              />
              <Input
                label="Konfirmasi Password Baru"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                error={fieldErrors.confirmPassword}
                disabled={saving}
                required
              />
            </div>

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

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/profile')}
            disabled={saving}
          >
            Batal
          </Button>
          <Button type="submit" loading={saving}>
            <KeyRound className="w-4 h-4" /> Simpan Password
          </Button>
        </div>
      </form>
    </div>
  );
}
