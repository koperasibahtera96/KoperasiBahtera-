import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export function PageLayout({ children, className, centered = false }: PageLayoutProps) {
  return (
    <div className={cn(
      'page-container',
      centered && 'flex-center',
      className
    )}>
      <div className="content-wrapper">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex-between mb-8 pb-4 border-b border-gray-200', className)}>
      <div>
        <h1 className="heading-primary">{title}</h1>
        {description && (
          <p className="text-muted mt-2">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h2 className="heading-secondary mb-2">{title}</h2>}
          {description && <p className="text-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}