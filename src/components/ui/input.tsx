import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm transition-all duration-300 focus-visible:-translate-y-[1px] focus-visible:shadow-premium-glow focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
