import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  hint?: string;
  /** ערך נוכחי שמוצג בקצה השורה (למשל "8 מודולים") */
  value?: string;
  children: (id: string) => ReactNode;
  className?: string;
}

/** שורת שדה עם תווית גלויה — לעולם לא placeholder בלבד. */
export function Field({ label, hint, value, children, className }: FieldProps): ReactNode {
  const id = useId();
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-fg">
          {label}
        </label>
        {value && <span className="font-mono text-xs text-fg-muted tabular-nums">{value}</span>}
      </div>
      {children(id)}
      {hint && <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p>}
    </div>
  );
}

interface SliderProps {
  id?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  'aria-label'?: string;
}

export function Slider({ id, min, max, step, value, onChange, ...rest }: SliderProps): ReactNode {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-6 w-full cursor-pointer appearance-none bg-transparent
        [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-surface-3
        [&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[var(--shadow-md)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110
        [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-surface-3
        [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-primary"
      {...rest}
    />
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

export function Switch({ checked, onChange, label, description }: SwitchProps): ReactNode {
  return (
    <label className="flex items-center justify-between gap-4 py-1">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{label}</span>
        {description && <span className="block text-xs text-fg-subtle">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm',
            'transition-[inset-inline-start] duration-200 ease-[var(--ease-spring)]',
            checked ? 'start-[1.375rem]' : 'start-0.5',
          )}
        />
      </button>
    </label>
  );
}

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  'aria-label': string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  ...rest
}: SegmentedProps<T>): ReactNode {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex w-full gap-1 rounded-[var(--radius-control)] border border-border bg-surface-2 p-1',
        size === 'sm' ? 'text-xs' : 'text-sm',
      )}
      {...rest}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-4px)] font-semibold',
              'transition-all duration-200 ease-[var(--ease-out-soft)]',
              size === 'sm' ? 'h-9 px-2' : 'h-10 px-3',
              active
                ? 'bg-surface text-fg shadow-[var(--shadow-sm)]'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
