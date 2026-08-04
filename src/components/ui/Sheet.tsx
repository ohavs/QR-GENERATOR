import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { fade, springSoft } from '@/lib/motion';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** שורת משנה קטנה מתחת לכותרת */
  subtitle?: string;
  /** תוכן קבוע שנצמד לתחתית הגיליון, מתחת לאזור הגלילה */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * גיליון תחתון — מכולת האפשרויות היחידה באפליקציה.
 *
 * במקום לפרוש את כל ההגדרות על המסך, כל קבוצה נפתחת כאן לפי דרישה. בטלפון
 * הוא עולה מלמטה ואפשר לגרור אותו למטה כדי לסגור; במסך רחב הוא הופך לחלון
 * ממורכז. כך יש פריסה אחת בלבד לתחזק, והיא נבנתה קודם כול לאגודל.
 */
export function Sheet({ open, onClose, title, subtitle, footer, children }: SheetProps): ReactNode {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // נעילת גלילת הרקע — בלי זה הגלילה "בורחת" מהגיליון לעמוד שמאחוריו
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // מיקוד נכנס לגיליון, כדי שניווט מקלדת ימשיך בתוכו
    const timer = setTimeout(() => panelRef.current?.focus(), 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      clearTimeout(timer);
    };
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    // סוגרים על גרירה משמעותית או על תנופה מהירה כלפי מטה
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="סגירה"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={springSoft}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={onDragEnd}
            className={cn(
              'relative flex max-h-[90dvh] w-full flex-col overflow-hidden bg-surface outline-none',
              'rounded-t-[var(--radius-sheet)] shadow-[var(--shadow-sheet)]',
              'sm:max-h-[86dvh] sm:max-w-lg sm:rounded-[var(--radius-sheet)]',
            )}
          >
            {/* ידית גרירה — גם רמז ויזואלי שאפשר לגרור, וגם אזור אחיזה */}
            <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            </div>

            <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-lg font-bold">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[0.8125rem] text-fg-muted">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגירה"
                className="-me-1 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X size={19} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>

            {footer && (
              <div className="safe-b shrink-0 border-t border-border bg-surface px-5 pb-4 pt-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
