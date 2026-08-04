import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';

/* ------------------------------------------------------------------ */
/* שורת הגדרה                                                          */
/* ------------------------------------------------------------------ */

interface SettingRowProps {
  icon: ReactNode;
  label: string;
  /** הערך הנוכחי — מוצג בשורה כדי שלא צריך לפתוח כדי לדעת מה נבחר */
  value: string;
  onClick: () => void;
  /** תצוגה מקדימה קטנה בקצה השורה (למשל דוגמית צבע) */
  trailing?: ReactNode;
}

/**
 * שורה שפותחת גיליון.
 *
 * המסך הראשי מציג רק את שם הקבוצה ואת הערך הנבחר; כל השאר מאחורי הקשה אחת.
 * זה מה שמונע ממסך אחד לשאת עשרים פקדים.
 */
export function SettingRow({ icon, label, value, onClick, trailing }: SettingRowProps): ReactNode {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.985 }}
      transition={springSnappy}
      className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-2"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-surface-2 text-fg-muted">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold">{label}</span>
        <span className="block truncate text-[0.8125rem] text-fg-muted">{value}</span>
      </span>

      {trailing}

      <ChevronLeft size={18} className="shrink-0 text-fg-subtle" aria-hidden />
    </motion.button>
  );
}

/** מקבץ שורות בכרטיס אחד עם מפרידים. */
export function RowGroup({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface [&>*+*]:border-t [&>*+*]:border-border">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* בחירה מתוך אפשרויות                                                 */
/* ------------------------------------------------------------------ */

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface PillsProps<T extends string | number> {
  options: Array<PillOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** 'rail' = שורה נגללת אופקית, 'grid' = רשת עוטפת */
  layout?: 'rail' | 'grid';
  columns?: number;
}

/**
 * בחירה מתוך אפשרויות בדידות — מחליף את המחוונים.
 *
 * מחוון דורש גרירה מדויקת עם האגודל ומסתיר את הערכים הטובים בין רעש; רשימת
 * אפשרויות מוגדרות היא הקשה אחת, יעד מגע גדול, וברור מה נבחר. סימן הבחירה
 * נע בין הפריטים עם `layoutId` במקום להיעלם ולהופיע.
 */
export function Pills<T extends string | number>({
  options,
  value,
  onChange,
  label,
  layout = 'rail',
  columns = 3,
}: PillsProps<T>): ReactNode {
  const groupId = useId();
  const scrollActiveIntoView = useScrollIntoView<HTMLButtonElement>();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        layout === 'rail' ? 'rail -mx-5 flex gap-2 px-5 py-0.5' : 'grid gap-2',
      )}
      style={layout === 'grid' ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <motion.button
            key={String(option.value)}
            ref={active && layout === 'rail' ? scrollActiveIntoView : undefined}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            className={cn(
              'relative flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4',
              'text-[0.8125rem] font-semibold transition-colors duration-200',
              active ? 'text-accent-fg' : 'bg-surface-2 text-fg-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`${groupId}-pill`}
                transition={springSnappy}
                className="absolute inset-0 rounded-full bg-accent"
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5 whitespace-nowrap">
              {option.icon}
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* מתג                                                                 */
/* ------------------------------------------------------------------ */

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-[var(--radius-tile)] py-2 text-start"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-fg-muted">
            {description}
          </span>
        )}
      </span>

      <span
        className={cn(
          'flex h-7 w-[3.25rem] shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
          checked ? 'justify-end bg-accent' : 'justify-start bg-surface-3',
        )}
      >
        <motion.span layout transition={springSnappy} className="block h-6 w-6 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* מקטע בתוך גיליון                                                    */
/* ------------------------------------------------------------------ */

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="space-y-2.5 py-4 first:pt-1">
      <div>
        <h3 className="text-[0.8125rem] font-bold text-fg">{title}</h3>
        {hint && <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Divider(): ReactNode {
  return <hr className="border-border" />;
}
