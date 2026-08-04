import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  undo?: () => void;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /**
   * הודעה עם ביטול.
   *
   * לפעולה הפיכה זו התשובה הנכונה במקום דיאלוג אישור: דיאלוג עוצר את המשתמש
   * לפני כל מחיקה, גם כשהוא יודע בדיוק מה הוא עושה, ואחרי שלוש פעמים הוא
   * מאשר אוטומטית. "בוטל" מציע דרך חזרה בלי לגבות מס על הפעולה הרגילה.
   */
  undoable: (message: string, undo: () => void) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-success' },
  error: { icon: TriangleAlert, className: 'text-danger' },
  info: { icon: Info, className: 'text-accent' },
};

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone, undo?: () => void) => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-1), { id, message, tone, undo }]);
      // חלון הביטול ארוך יותר: צריך להספיק לקרוא, להבין, ולהחליט
      const life = undo ? 6500 : tone === 'error' ? 5200 : 3200;
      setTimeout(() => dismiss(id), life);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
      undoable: (m, undo) => push(m, 'info', undo),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/*
        מלמעלה ולא מלמטה: תחתית המסך שמורה לרציף הייצוא, והתראה שמכסה את
        כפתור ההורדה בדיוק ברגע שהוא נלחץ היא בדיוק ההתראה הלא נכונה.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, className } = TONES[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={springSoft}
                className="pointer-events-auto flex max-w-[26rem] items-center gap-2.5 rounded-full border border-border bg-surface py-2.5 pe-4 ps-3.5 text-[0.875rem] font-medium shadow-[var(--shadow-pop)]"
              >
                <Icon size={16} className={cn('shrink-0', className)} aria-hidden />
                <span>{toast.message}</span>

                {toast.undo && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.undo?.();
                      dismiss(toast.id);
                    }}
                    className="-me-2 ms-0.5 shrink-0 rounded-full bg-ink px-3 py-1.5 text-[0.8125rem] font-bold text-ink-fg transition-opacity hover:opacity-85"
                  >
                    ביטול
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast חייב לרוץ בתוך ToastProvider');
  return ctx;
}
