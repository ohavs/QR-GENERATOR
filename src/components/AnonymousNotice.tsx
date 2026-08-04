import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, TriangleAlert, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';
import {
  clearExpiryTracking,
  dismissExpiryNotice,
  evaluateExpiry,
  expiryMessage,
  recordVisit,
  type ExpiryUrgency,
} from '@/lib/anonymousExpiry';
import { springSoft } from '@/lib/motion';
import type { AuthState } from '@/hooks/useAuth';

interface AnonymousNoticeProps {
  auth: AuthState;
  /** מוצג רק כשיש מה לאבד — משתמש בלי קודים לא צריך אזהרה */
  hasLinks: boolean;
  onLinked: () => void;
  onError: (message: string) => void;
}

const TONE: Record<Exclude<ExpiryUrgency, 'none'>, string> = {
  reminder: 'border-border bg-surface',
  soon: 'border-warning/40 bg-warning/10',
  critical: 'border-danger/40 bg-danger/10',
};

/**
 * אזהרת תפוגה לחשבון אנונימי.
 *
 * מוצגת רק למי שכבר יצר קודים — אזהרה על אובדן משהו שעדיין לא קיים היא רעש.
 * הפעולה שהיא מציעה היא קישור החשבון, שמשמר את אותו מזהה משתמש ואת כל
 * הקודים; זו הסיבה שהיא מוצגת בכלל.
 */
export function AnonymousNotice({
  auth,
  hasLinks,
  onLinked,
  onError,
}: AnonymousNoticeProps): ReactNode {
  const [notice, setNotice] = useState<ReturnType<typeof evaluateExpiry> | null>(null);
  const [busy, setBusy] = useState(false);
  const daysAway = useRef<number | null>(null);

  // הביקור נרשם פעם אחת בעליית האפליקציה: קריאה נוספת הייתה רואה את הביקור
  // הנוכחי כקודם ומאפסת את הפער שאנחנו מנסים למדוד
  if (daysAway.current === null) daysAway.current = recordVisit();

  useEffect(() => {
    if (!auth.user?.isAnonymous || !hasLinks) {
      setNotice(null);
      return;
    }
    const result = evaluateExpiry(daysAway.current ?? 0);
    setNotice(result.urgency === 'none' ? null : result);
  }, [auth.user, hasLinks]);

  const dismiss = useCallback(() => {
    dismissExpiryNotice();
    setNotice(null);
  }, []);

  const link = useCallback(async () => {
    setBusy(true);
    try {
      const result = await auth.signInWithGoogle();
      if (result === 'switched') {
        onError('חשבון הגוגל הזה כבר בשימוש. הקודים האנונימיים נשארו בחשבון הקודם.');
      } else {
        clearExpiryTracking();
        setNotice(null);
        onLinked();
      }
    } catch {
      onError('קישור החשבון נכשל');
    } finally {
      setBusy(false);
    }
  }, [auth, onLinked, onError]);

  if (!notice || notice.urgency === 'none') return null;

  const { title, body } = expiryMessage(notice);
  const Icon = notice.urgency === 'reminder' ? ShieldAlert : TriangleAlert;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={springSoft}
        role="status"
        className="overflow-hidden"
      >
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-[var(--radius-tile)] border p-3.5',
            TONE[notice.urgency],
          )}
        >
          <Icon
            size={16}
            className={cn(
              'mt-0.5 shrink-0',
              notice.urgency === 'critical'
                ? 'text-danger'
                : notice.urgency === 'soon'
                  ? 'text-warning'
                  : 'text-fg-muted',
            )}
            aria-hidden
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-[0.875rem] font-bold">{title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-fg-muted">{body}</p>
            </div>

            <Button variant="ink" size="sm" loading={busy} onClick={() => void link()}>
              שמירת הקודים עם חשבון גוגל
            </Button>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="סגירת ההודעה"
            className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
