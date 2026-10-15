import { cn } from '@/lib/cn';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-bg text-secondary border border-border',
  success: 'bg-success/8 text-success border border-success/15',
  warning: 'bg-warning/8 text-warning border border-warning/15',
  danger: 'bg-danger/8 text-danger border border-danger/15',
  info: 'bg-info/8 text-info border border-info/15',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    ACTIVE: { variant: 'success', label: 'Active' },
    INACTIVE: { variant: 'default', label: 'Inactive' },
    EXPIRED: { variant: 'warning', label: 'Expired' },
    SUSPENDED: { variant: 'info', label: 'Suspended' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    REVOKED: { variant: 'danger', label: 'Revoked' },
    VALID: { variant: 'success', label: 'Valid' },
    NOT_FOUND: { variant: 'danger', label: 'Not Found' },
  };

  const config = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
