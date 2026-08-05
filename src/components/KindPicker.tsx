import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fade, springSnappy } from '@/lib/motion';
import { CONTENT_ORDER, CONTENT_TYPES, type ContentKind } from '@/lib/qr/content';

interface KindPickerProps {
  kind: ContentKind;
  onChange: (kind: ContentKind) => void;
}

/**
 * בורר סוג התוכן.
 *
 * היה שורה נגללת של עשרה צ'יפים. שורה כזאת תופסת את הרוחב המלא של המסך
 * העליון בשביל בחירה שרוב המשתמשים עושים פעם אחת — ומסתירה שמונה מהאפשרויות
 * מעבר לקצה, כך שהן קיימות בלי להיראות. כאן זה פריט אחד שמראה את הבחירה
 * הנוכחית ופותח את כל העשר ברשימה, והמקום שהתפנה בשורה העליונה עבר לפעולות
 * שבאמת שווה להציג תמיד.
 */
export function KindPicker({ kind, onChange }: KindPickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const type = CONTENT_TYPES[kind];
  const Icon = type.icon;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.97 }}
        transition={springSnappy}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-full border px-4 transition-colors',
          open ? 'border-fg bg-surface' : 'border-border bg-surface hover:border-border-strong',
        )}
      >
        <Icon size={16} className="shrink-0 text-accent" aria-hidden />
        <span className="flex-1 text-start text-[0.875rem] font-semibold">{type.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={springSnappy}>
          <ChevronDown size={16} className="text-fg-subtle" aria-hidden />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="סוג התוכן"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={fade}
            className={cn(
              'absolute inset-x-0 top-full z-40 mt-2 max-h-[19rem] overflow-y-auto overscroll-contain',
              'rounded-[var(--radius-card)] border border-border bg-surface p-1.5',
              'shadow-[var(--shadow-pop)]',
            )}
          >
            {CONTENT_ORDER.map((k) => {
              const option = CONTENT_TYPES[k];
              const OptionIcon = option.icon;
              const active = k === kind;
              return (
                <li key={k}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(k);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-11 w-full items-center gap-2.5 rounded-full px-3 text-start transition-colors',
                      active ? 'bg-surface-2 font-bold' : 'font-medium hover:bg-surface-2',
                    )}
                  >
                    <OptionIcon
                      size={16}
                      className={cn('shrink-0', active ? 'text-accent' : 'text-fg-subtle')}
                      aria-hidden
                    />
                    <span className="flex-1 truncate text-[0.875rem]">{option.label}</span>
                    {active && <Check size={15} className="shrink-0 text-accent" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
