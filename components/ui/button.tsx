'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A7A3A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-4',
  {
    variants: {
      variant: {
        default: 'bg-[#2A7A3A] text-white hover:bg-[#225F2F] shadow-sm',
        destructive: 'bg-[#E05A1A] text-white hover:bg-[#C04810]',
        outline: 'border-2 border-[#2A7A3A] text-[#2A7A3A] bg-white hover:bg-[#E8F5EA]',
        secondary: 'bg-[#E8F5EA] text-[#2A7A3A] hover:bg-[#d4edda]',
        ghost: 'text-[#2A7A3A] hover:bg-[#E8F5EA]',
        link: 'text-[#2A7A3A] underline-offset-4 hover:underline p-0 min-h-0',
        danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-14 px-8 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
export { Button, buttonVariants };
