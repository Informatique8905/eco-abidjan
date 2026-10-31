import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={selectId} className="text-sm font-medium text-[#16160F]">{label}</label>}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'flex h-12 w-full appearance-none rounded-xl border bg-white px-4 py-2 pr-10 text-sm text-[#16160F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7A3A] focus-visible:border-transparent transition-all duration-150 min-h-[44px]',
            error ? 'border-[#E05A1A]' : 'border-[#DEDED0]',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5C48] pointer-events-none" />
      </div>
      {error && <p className="text-xs text-[#E05A1A]">{error}</p>}
    </div>
  );
}
