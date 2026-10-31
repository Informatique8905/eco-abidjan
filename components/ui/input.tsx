import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-[#16160F]">{label}</label>}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-xl border bg-white px-4 py-2 text-sm text-[#16160F] placeholder:text-[#5C5C48]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7A3A] focus-visible:border-transparent transition-all duration-150 min-h-[44px]',
            error ? 'border-[#E05A1A]' : 'border-[#DEDED0]',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && <p id={`${inputId}-error`} className="text-xs text-[#E05A1A]" role="alert">{error}</p>}
        {hint && !error && <p id={`${inputId}-hint`} className="text-xs text-[#5C5C48]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
