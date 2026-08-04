import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cn } from '@/lib/cn';
import { fade, springSoft } from '@/lib/motion';

export interface ConfirmRequest {
  title: string;
  /** מה בדיוק יקרה — לא "האם אתה בטוח", אלא התוצאה */
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
}

type Resolver = (confirmed: boolean) => void;

const ConfirmContext = createContext<((request: ConfirmRequest) => Promise<boolean>) | null>(null);

/**
 * דיאלוג אישור.
 *
 * מחליף את `window.confirm`. לא רק בגלל המראה: הדיאלוג של הדפדפן חוסם את
 * התהליך, מציג את שם הדומיין, ומנסח את הפעולה בכפתורי "אישור/ביטול" שאינם
 * אומרים מה עומד לקרות. כאן הכפתור נושא את הפעולה עצמה ("מחיקת הקוד"), וזה
 * ההבדל בין אישור מודע לבין הקשה אוטומטית.
 */
export function ConfirmProvider({ children }: { children: ReactNode }): ReactNode {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<Resolver | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((next: ConfirmRequest) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setRequest(next);
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
  }, []);

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent): void => {
      // Escape מבטל תמיד; Enter מאשר רק כשהמיקוד כבר על כפתור האישור
      if (e.key === 'Escape') {
        e.stopPropagation();
        settle(false);
      }
    };
    document.addEventListener('keydown', onKey, true);
    const timer = setTimeout(() => confirmRef.current?.focus(), 80);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      clearTimeout(timer);
    };
  }, [request, settle]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {request && (
              // z גבוה מהגיליונות: אישור נפתח כמעט תמיד מתוך גיליון
              <div className="fixed inset-0 z-[95] grid place-items-center p-5">
                <motion.button
                  type="button"
                  aria-label={request.cancelLabel ?? 'ביטול'}
                  onClick={() => settle(false)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                  className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
                />

                <motion.div
                  role="alertdialog"
                  aria-modal="true"
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={springSoft}
                  className="relative w-full max-w-[22rem] overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-pop)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                        request.tone === 'danger'
                          ? 'bg-danger/12 text-danger'
                          : 'bg-surface-2 text-fg-muted',
                      )}
                    >
                      <TriangleAlert size={18} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="text-[0.9375rem] font-bold">{request.title}</h2>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-fg-muted">
                        {request.body}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Button
                      ref={confirmRef}
                      variant={request.tone === 'danger' ? 'danger' : 'ink'}
                      size="md"
                      block
                      onClick={() => settle(true)}
                    >
                      {request.confirmLabel}
                    </Button>
                    <Button variant="soft" size="md" onClick={() => settle(false)}>
                      {request.cancelLabel ?? 'ביטול'}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}

/** מחזיר פונקציה שמציגה אישור ומחזירה האם המשתמש אישר. */
export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm חייב לרוץ בתוך ConfirmProvider');
  return confirm;
}
