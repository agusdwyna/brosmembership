import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
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
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Password baru harus berbeda dari password lama',
    path: ['newPassword'],
  });

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  disabled?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  helper,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex items-center gap-1 text-[12px] text-muted hover:text-foreground transition-colors"
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {visible ? 'Sembunyikan' : 'Tampilkan'}
        </button>
      </div>
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helper={helper}
        disabled={disabled}
        autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'}
        required
      />
    </div>
  );
}

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
            <PasswordField
              id="currentPassword"
              label="Password Lama"
              value={form.currentPassword}
              onChange={(value) => handleChange('currentPassword', value)}
              error={fieldErrors.currentPassword}
              disabled={saving}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <PasswordField
                id="newPassword"
                label="Password Baru"
                value={form.newPassword}
                onChange={(value) => handleChange('newPassword', value)}
                error={fieldErrors.newPassword}
                helper="Minimal 6 karakter."
                disabled={saving}
              />
              <PasswordField
                id="confirmPassword"
                label="Konfirmasi Password Baru"
                value={form.confirmPassword}
                onChange={(value) => handleChange('confirmPassword', value)}
                error={fieldErrors.confirmPassword}
                disabled={saving}
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
