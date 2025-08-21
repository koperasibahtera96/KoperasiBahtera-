import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Grid({ children, cols = 4, gap = 'md', className }: GridProps) {
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid grid-cols-1 md:grid-cols-2',
    3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-responsive',
  };
  
  const gapMap = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };
  
  return (
    <div className={cn(
      'grid',
      colsMap[cols],
      gapMap[gap],
      className
    )}>
      {children}
    </div>
  );
}

interface FlexProps {
  children: ReactNode;
  direction?: 'row' | 'col';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
}

export function Flex({ 
  children, 
  direction = 'row', 
  align = 'start', 
  justify = 'start',
  gap = 'md',
  wrap = false,
  className 
}: FlexProps) {
  const directionMap = {
    row: 'flex-row',
    col: 'flex-col',
  };
  
  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  
  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };
  
  const gapMap = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };
  
  return (
    <div className={cn(
      'flex',
      directionMap[direction],
      alignMap[align],
      justifyMap[justify],
      gapMap[gap],
      wrap && 'flex-wrap',
      className
    )}>
      {children}
    </div>
  );
}