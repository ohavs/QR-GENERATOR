import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';

type Variant = 'ink' | 'soft' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  /** הכפתור הראשי: דיו מלא. אחד כזה במסך, לפעולה העיקרית בלבד. */
  ink: 'bg-ink text-ink-fg hover:bg-ink-hover',
  soft: 'bg-surface-2 text-fg hover:bg-surface-3',
  outline: 'border border-border-strong text-fg hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
};

/** כל הגבהים ≥44px — יעד המגע המינימלי בטלפון. */
const SIZES: Record<Size, string> = {
  sm: 'h-11 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-[0.9375rem] gap-2',
  lg: 'h-14 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'soft', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold',
        'transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {loading ? (
        <Loader2 size={17} className="animate-spin" aria-hidden />
      ) : (
        icon && <span className="shrink-0 [&>svg]:block">{icon}</span>
      )}
      {children}
    </motion.button>
  );
});

/** כפתור אייקון עגול — לפעולות משניות בכותרת ובשורות. */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(function IconButton(
  { className, children, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      className={cn('aspect-square !px-0', className)}
      {...rest}
    >
      {children}
    </Button>
  );
});
