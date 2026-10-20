import { cn } from '@/lib/cn';

type ActionVariant = 'default' | 'brand' | 'danger';

export interface RowAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  disabled?: boolean;
}

const variantStyles: Record<ActionVariant, string> = {
  default: 'border-border text-secondary hover:bg-bg hover:text-foreground',
  brand: 'border-brand/40 text-brand hover:bg-brand/5',
  danger: 'border-danger/40 text-danger hover:bg-danger/5',
};

interface RowActionsProps {
  actions: RowAction[];
  className?: string;
}

/**
 * Labelled action buttons for a table's Actions column. Text labels keep every
 * action discoverable without hovering — an icon-only + tooltip pattern hid
 * intent from operators who are not icon-literate (and tooltips never show on
 * touch). Buttons are outline only so a full table never becomes a wall of
 * solid maroon (§3: one primary button per screen). Stops click propagation so
 * pressing a button never triggers the row's own click handler.
 */
export function RowActions({ actions, className }: RowActionsProps) {
  const visible = actions.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn('flex items-center justify-end gap-2', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {visible.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center justify-center h-8 px-2.5 rounded-[4px] border bg-surface',
            'text-[12px] font-medium whitespace-nowrap transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
            'disabled:opacity-40 disabled:pointer-events-none',
            variantStyles[action.variant ?? 'default'],
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
