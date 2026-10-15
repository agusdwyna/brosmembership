import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-surface rounded-[4px] border border-border', className)}>{children}</div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn('px-5 py-3 border-b border-border', className)}>{children}</div>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
