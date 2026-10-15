import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from './api';
import { loginSchema } from '@/features/members/validation';
import { useFormErrors } from '@/lib/use-form-error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BrandLogos } from '@/components/shared/BrandLogos';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();

    if (!validate(loginSchema, { email, password })) return;

    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      login(data.data.user, data.data.accessToken);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setFormError(axiosErr.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogos variant="onLight" size="md" className="justify-center mb-3" />
          <h1 className="text-[20px] font-semibold text-foreground">Bros Membership</h1>
          <p className="text-[13px] text-secondary mt-1">Sign in to your account</p>
        </div>

        <div className="bg-surface rounded-[4px] border border-border p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="admin@bros-hospital.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
                if (formError) setFormError('');
              }}
              error={fieldErrors.email}
              disabled={loading}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
                if (formError) setFormError('');
              }}
              error={fieldErrors.password}
              disabled={loading}
              required
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

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
