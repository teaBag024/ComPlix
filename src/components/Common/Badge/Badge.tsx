import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

export { cn };

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
  withDot?: boolean;
  count?: number;
}

export interface BadgeDotProps extends React.SVGProps<SVGSVGElement> {}
export interface BadgeCountProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

const badgeVariants = cva(
  'inline-flex items-center gap-[5px] whitespace-nowrap border border-transparent rounded-[2px] px-[7px] py-[2px] text-[10.5px] font-semibold font-mono leading-[1.4] transition-colors focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2',
  {
    variants: {
      variant: {
        sky: 'bg-[#E0F2FE] text-[#0369A1] border-[rgba(56,189,248,0.3)] dark:bg-[rgba(56,189,248,0.16)] dark:text-[#7DD3FC] dark:border-[rgba(56,189,248,0.3)]',
        mint: 'bg-[#D1FAE5] text-[#065F46] border-[rgba(52,211,153,0.3)] dark:bg-[rgba(52,211,153,0.16)] dark:text-[#6EE7B7] dark:border-[rgba(52,211,153,0.3)]',
        apricot: 'bg-[#FFEDD5] text-[#9A3412] border-[rgba(251,146,60,0.3)] dark:bg-[rgba(251,146,60,0.16)] dark:text-[#FDBA74] dark:border-[rgba(251,146,60,0.3)]',
        rose: 'bg-[#FFE4E6] text-[#9F1239] border-[rgba(251,113,133,0.3)] dark:bg-[rgba(251,113,133,0.16)] dark:text-[#FDA4AF] dark:border-[rgba(251,113,133,0.3)]',
        lilac: 'bg-[#F3E8FF] text-[#6B21A8] border-[rgba(192,132,252,0.3)] dark:bg-[rgba(192,132,252,0.16)] dark:text-[#D8B4FE] dark:border-[rgba(192,132,252,0.3)]',
        lemon: 'bg-[#FEF9C3] text-[#854D0E] border-[rgba(250,204,21,0.3)] dark:bg-[rgba(250,204,21,0.16)] dark:text-[#FDE047] dark:border-[rgba(250,204,21,0.3)]',
        mono: 'bg-[#F3F4F6] text-[#111827] border-[#E5E7EB] dark:bg-[#1E1E22] dark:text-[#FAFAFA] dark:border-[#27272A]',
        solid: 'bg-[#111827] text-white border-[#111827] dark:bg-[#F4F4F5] dark:text-[#09090B] dark:border-[#F4F4F5]',
        default: 'bg-[#111827] text-white border-[#111827] dark:bg-[#F4F4F5] dark:text-[#09090B] dark:border-[#F4F4F5]',
        secondary: 'bg-[#F3F4F6] text-[#111827] border-[#E5E7EB] dark:bg-[#1E1E22] dark:text-[#FAFAFA] dark:border-[#27272A]',
        destructive: 'bg-[#FFE4E6] text-[#9F1239] border-[rgba(251,113,133,0.3)] dark:bg-[rgba(251,113,133,0.16)] dark:text-[#FDA4AF] dark:border-[rgba(251,113,133,0.3)]',
        outline: 'bg-transparent border-[#E5E7EB] text-[#111827] dark:border-[#27272A] dark:text-[#FAFAFA]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const BadgeDot = React.forwardRef<SVGSVGElement, BadgeDotProps>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width="6"
    height="6"
    fill="currentColor"
    viewBox="0 0 6 6"
    className={cn('shrink-0 rounded-[1px]', className)}
    {...props}
  >
    <rect width="6" height="6" rx="1" />
  </svg>
));
BadgeDot.displayName = 'BadgeDot';

const BadgeCount = React.forwardRef<HTMLSpanElement, BadgeCountProps>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('ml-[3px] px-1 text-[9.5px] border border-subtle bg-canvas text-ink', className)}
    {...props}
  />
));
BadgeCount.displayName = 'BadgeCount';

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, asChild, withDot, count, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span';
    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {withDot && <BadgeDot aria-hidden="true" />}
        {children}
        {count != null && <BadgeCount>{count}</BadgeCount>}
      </Comp>
    );
  }
);

Badge.displayName = 'Badge';

export {
  Badge,
  badgeVariants,
  BadgeDot,
  BadgeCount,
};
