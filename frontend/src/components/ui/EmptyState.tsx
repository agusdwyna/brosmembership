import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-9 h-9 rounded-[4px] bg-bg flex items-center justify-center mb-3">
        {icon || <Inbox className="w-4 h-4 text-muted" />}
      </div>
      <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
      {description && <p className="text-[12px] text-secondary mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
