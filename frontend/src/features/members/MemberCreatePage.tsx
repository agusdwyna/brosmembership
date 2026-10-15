import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { membersApi } from './api';
import type { CreateMemberInput } from './types';
import { createMemberSchema } from './validation';
import { useFormErrors } from '@/lib/use-form-error';
import { membershipTypesApi } from '@/features/membership-types/api';
import type { MembershipType } from '@/features/membership-types/types';
import { companiesApi } from '@/features/companies/api';
import type { Company } from '@/features/companies/types';
import { toast } from '@/components/ui/toast-store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export function MemberCreatePage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const { fieldErrors, formError, setFormError, validate, clearFieldError, clearAll } =
    useFormErrors();
  const [form, setForm] = useState<CreateMemberInput>({
    fullName: '',
    nik: '',
    phone: '',
    email: '',
    address: '',
    dateOfBirth: '',
    companyId: '',
    membershipTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    membershipTypesApi
      .list()
      .then((res) => setTypes(res.data.data.filter((t) => t.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat tipe membership'));
    companiesApi
      .list()
      .then((res) => setCompanies(res.data.data.filter((c) => c.status === 'ACTIVE')))
      .catch(() => toast.error('Gagal memuat data perusahaan'));
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (formError) setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAll();

    if (!validate(createMemberSchema, form)) return;

    setLoading(true);
    try {
      const { data } = await membersApi.create(form);
      toast.success('Member created successfully');
      navigate(`/members/${data.data.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr.response?.data?.error || 'Failed to create member';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = types.map((t) => ({ value: t.id, label: `${t.name} (${t.duration} days)` }));
  const selectedType = types.find((t) => t.id === form.membershipTypeId);
  const endDate = selectedType
    ? new Date(new Date(form.startDate).getTime() + selectedType.duration * 86400000)
    : null;

  return (
    <div>
      <PageHeader
        title="Add Member"
        description="Register a new member with membership"
        backTo="/members"
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <h3>Member Information</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Enter full name"
                error={fieldErrors.fullName}
                disabled={loading}
                required
                className="sm:col-span-2"
              />
              <Input
                label="NIK"
                value={form.nik}
                onChange={(e) => handleChange('nik', e.target.value)}
                placeholder="16 digit NIK"
                error={fieldErrors.nik}
                disabled={loading}
                required
                maxLength={16}
                className="sm:col-span-2"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="08xxx"
                error={fieldErrors.phone}
                disabled={loading}
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@example.com"
                error={fieldErrors.email}
                disabled={loading}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth || ''}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                disabled={loading}
              />
              <Select
                label="Company"
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="No company"
                value={form.companyId || ''}
                onChange={(e) => handleChange('companyId', e.target.value)}
                disabled={loading}
              />
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Full address"
                disabled={loading}
                className="sm:col-span-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3>Membership</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Select
                label="Membership Type"
                options={typeOptions}
                placeholder="Select type"
                value={form.membershipTypeId}
                onChange={(e) => handleChange('membershipTypeId', e.target.value)}
                error={fieldErrors.membershipTypeId}
                disabled={loading}
                required
              />
              <Input
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                error={fieldErrors.startDate}
                disabled={loading}
                required
              />
            </div>
            {endDate && (
              <div className="mt-3 bg-bg rounded-[4px] px-4 py-3 text-[13px]">
                <span className="text-secondary">End date: </span>
                <span className="font-medium">
                  {endDate.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
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
            disabled={loading}
            onClick={() => navigate('/members')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save & Issue Card
          </Button>
        </div>
      </form>
    </div>
  );
}
