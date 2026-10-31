import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
      'bg-[#E8F5EA] text-[#2A7A3A]': variant === 'default' || variant === 'success',
      'bg-yellow-50 text-yellow-700 border border-yellow-200': variant === 'warning',
      'bg-red-50 text-red-600 border border-red-200': variant === 'error',
      'bg-blue-50 text-blue-600 border border-blue-200': variant === 'info',
      'bg-white text-[#5C5C48] border border-[#DEDED0]': variant === 'outline',
    }, className)} {...props} />
  );
}
