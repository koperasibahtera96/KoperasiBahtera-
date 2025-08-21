import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  children: ReactNode;
  className?: string;
}

export function FormField({ children, className }: FormFieldProps) {
  return (
    <div className={cn('form-group', className)}>
      {children}
    </div>
  );
}

interface FormRowProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FormRow({ children, cols = 2, className }: FormRowProps) {
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className={cn(
      'grid gap-4',
      colsMap[cols],
      className
    )}>
      {children}
    </div>
  );
}

interface FormActionsProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function FormActions({ children, align = 'right', className }: FormActionsProps) {
  const alignMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };
  
  return (
    <div className={cn(
      'flex items-center gap-3 pt-4 mt-6 border-t border-gray-200',
      alignMap[align],
      className
    )}>
      {children}
    </div>
  );
}