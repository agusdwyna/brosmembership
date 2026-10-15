import { Button } from './Button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backTo?: string;
}

export function PageHeader({ title, description, action, backTo }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {backTo && (
          <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h1>{title}</h1>
          {description && <p className="text-[13px] text-secondary mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
