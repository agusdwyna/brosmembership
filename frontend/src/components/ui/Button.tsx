import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-brand text-white hover:opacity-90 active:opacity-80',
  secondary: 'bg-surface text-foreground border border-border-strong hover:bg-bg active:bg-border',
  ghost: 'text-secondary hover:text-foreground hover:bg-bg',
  text: 'text-brand hover:text-brand-dark',
  danger: 'bg-danger text-white hover:opacity-90 active:opacity-80',
};

const sizes = {
  sm: 'h-8 px-3 text-[13px] font-medium',
  md: 'h-9 px-3.5 text-[13px] font-medium',
  lg: 'h-10 px-4 text-[13px] font-medium',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-[4px] transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-brand/20',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
