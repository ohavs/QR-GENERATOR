import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg shadow-[var(--shadow-md)] hover:bg-primary-hover hover:shadow-[var(--shadow-lg)] active:shadow-[var(--shadow-sm)]',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-border',
  outline: 'border border-border-strong text-fg hover:bg-surface-2 hover:border-primary',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
};

const SIZES: Record<Size, string> = {
  // 44px+ בגובה — עומד בדרישת יעד המגע המינימלי
  sm: 'h-10 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-4 text-sm gap-2 rounded-[var(--radius-control)]',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold',
        'transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-out-soft)]',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 size={17} className="animate-spin" aria-hidden />
      ) : (
        icon && <span className="shrink-0 [&>svg]:block">{icon}</span>
      )}
      {children}
    </button>
  );
});
