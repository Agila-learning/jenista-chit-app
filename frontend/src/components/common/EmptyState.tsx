import { Button } from './Button';
import { FolderSearch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon = FolderSearch,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="text-lg font-bold text-primary-900 mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6">{description}</p>
      
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
