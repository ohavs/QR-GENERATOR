import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SIZES, SIZE_GROUPS, type SizeGroup, type SizePreset } from '@/lib/sizes';

interface SizePickerProps {
  value: string;
  onChange: (size: SizePreset) => void;
}

const GROUP_ORDER: SizeGroup[] = ['digital', 'print', 'social'];

export function SizePicker({ value, onChange }: SizePickerProps): ReactNode {
  return (
    <div className="space-y-5">
      {GROUP_ORDER.map((group) => (
        <section key={group} className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-fg-subtle">
            {SIZE_GROUPS[group]}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SIZES.filter((s) => s.group === group).map((size) => {
              const active = size.id === value;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => onChange(size)}
                  aria-pressed={active}
                  className={cn(
                    'relative flex flex-col items-start gap-0.5 rounded-2xl border p-3 text-start',
                    'transition-all duration-200 ease-[var(--ease-out-soft)] hover:-translate-y-0.5',
                    active
                      ? 'border-primary bg-primary-soft shadow-[var(--shadow-sm)]'
                      : 'border-border bg-surface hover:border-border-strong',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-bold',
                      active ? 'text-primary' : 'text-fg',
                    )}
                  >
                    {size.label}
                  </span>
                  <span className="text-[11px] leading-snug text-fg-subtle">{size.hint}</span>
                  {active && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className="absolute end-2.5 top-2.5 text-primary"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-fg-muted">
        כל העיצובים נבנים כווקטור, ולכן נשארים חדים בכל גודל — מאייקון של 256 פיקסל ועד כרזת A4
        להדפסה ב‑300DPI. בגדלים שאינם ריבועיים הקוד ממורכז אוטומטית על רקע תואם.
      </p>
    </div>
  );
}
