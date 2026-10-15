import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DataToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export function DataToolbar({ children, className }: DataToolbarProps) {
  return (
    <div className={cn('flex items-center gap-3 px-5 py-3 border-b border-border', className)}>
      {children}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onSubmit,
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSubmit?.();
  };

  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-[4px] border border-border bg-surface text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
      />
    </div>
  );
}
