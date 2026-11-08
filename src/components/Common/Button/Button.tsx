import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] border border-transparent font-sans font-semibold transition-colors duration-120 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#111827] text-white border-[#111827] hover:bg-[#1F2937] dark:bg-[#F4F4F5] dark:text-[#09090B] dark:border-[#F4F4F5] dark:hover:bg-[#E4E4E7] focus-visible:ring-[#111827] dark:focus-visible:ring-[#F4F4F5]',
        secondary:
          'bg-[#F3F4F6] text-[#111827] border-[#E5E7EB] hover:border-[#111827] hover:bg-white dark:bg-[#1E1E22] dark:text-[#FAFAFA] dark:border-[#27272A] dark:hover:border-[#F4F4F5] dark:hover:bg-[#1F1F23] focus-visible:ring-[#111827] dark:focus-visible:ring-[#F4F4F5]',
        outline:
          'bg-transparent text-[#111827] border-[#111827] hover:bg-[#F3F4F6] dark:text-[#FAFAFA] dark:border-[#F4F4F5] dark:hover:bg-[#1E1E22] focus-visible:ring-[#111827] dark:focus-visible:ring-[#F4F4F5]',
        ghost:
          'bg-transparent text-[#4B5563] border-transparent hover:bg-[#F3F4F6] hover:text-[#111827] hover:border-[#E5E7EB] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E22] dark:hover:text-[#FAFAFA] dark:hover:border-[#27272A] focus-visible:ring-[#111827] dark:focus-visible:ring-[#F4F4F5]',
        mint:
          'bg-[#D1FAE5] text-[#065F46] border-[#34D399]/45 hover:border-[#065F46] dark:bg-[rgba(52,211,153,0.16)] dark:text-[#6EE7B7] dark:border-[#34D399]/45 focus-visible:ring-[#065F46] dark:focus-visible:ring-[#6EE7B7]',
        danger:
          'bg-[#FFE4E6] text-[#9F1239] border-[#FB7185]/45 hover:border-[#9F1239] dark:bg-[rgba(251,113,133,0.16)] dark:text-[#FDA4AF] dark:border-[#FB7185]/45 focus-visible:ring-[#9F1239] dark:focus-visible:ring-[#FDA4AF]',
        // The animated gradient (light) and gradient text on black (dark) come from `.btn-rainbow` in style.css.
        rainbow:
          'btn-rainbow text-[#111827] font-bold border-[#111827] dark:border-[#27272A] focus-visible:ring-[#111827] dark:focus-visible:ring-[#F4F4F5]',
        // Style guide navigation tab: muted until marked current (aria-current) or pressed (aria-pressed).
        nav:
          'bg-tab-muted text-ink-secondary border-subtle font-medium hover:text-ink hover:border-strong aria-[current=page]:bg-tab-active aria-[current=page]:text-ink aria-[current=page]:border-strong aria-[current=page]:font-semibold aria-pressed:bg-tab-active aria-pressed:text-ink aria-pressed:border-strong aria-pressed:font-semibold focus-visible:ring-focus',
        // Text-like action for list entries and inline navigation.
        link:
          'justify-start whitespace-normal text-left [overflow-wrap:anywhere] bg-transparent text-ink border-transparent font-medium hover:bg-tab-muted hover:border-subtle aria-pressed:bg-tab-muted aria-pressed:border-strong aria-pressed:font-semibold focus-visible:ring-focus',
      },
      size: {
        sm: 'text-[11px] px-[10px] py-[4px]',
        md: 'text-[12px] px-[14px] py-[7px]',
        lg: 'text-[13px] px-[18px] py-[10px]',
        icon: 'px-[9px] py-[7px] font-mono text-[12px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

// The native `type` default is left intact: forms in the app rely on submit buttons.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {variant === 'rainbow' && !asChild ? <span className="btn-rainbow-label">{children}</span> : children}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export type { VariantProps };
export { Button, buttonVariants };
export default Button;
