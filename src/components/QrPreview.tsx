import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Loader2, QrCode, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { QrSvg } from './QrSvg';
import { cn } from '@/lib/cn';
import type { ScanContrast } from '@/lib/contrast';
import { EASE_OUT, fade } from '@/lib/motion';
import type { QrGeometry } from '@/lib/qr/types';
import type { ScanCheckState } from '@/hooks/useScanCheck';

interface QrPreviewProps {
  geo: QrGeometry | null;
  error: string | null;
  isEmpty: boolean;
  transparent: boolean;
  scanCheck: ScanCheckState;
  contrast: ScanContrast;
  /** משתנה בכל שינוי חזותי — מפעיל את מעבר התצוגה */
  animationKey: string;
}

export function QrPreview({
  geo,
  error,
  isEmpty,
  transparent,
  scanCheck,
  contrast,
  animationKey,
}: QrPreviewProps): ReactNode {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          'mx-auto grid aspect-square w-full max-w-[15.5rem] place-items-center rounded-[var(--radius-card)] p-3.5 sm:max-w-[17rem] sm:p-4',
          geo
            ? transparent
              ? 'checkerboard border border-border'
              : 'border border-border bg-surface'
            : 'border border-dashed border-border-strong',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {geo ? (
            <motion.div
              key={animationKey}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="w-full"
            >
              <QrSvg geo={geo} title="קוד QR" className="w-full" />
            </motion.div>
          ) : (
            <motion.div
              key={error ? 'error' : 'empty'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
              className="flex flex-col items-center gap-3 px-8 text-center"
            >
              {error ? (
                <>
                  <TriangleAlert size={26} className="text-danger" aria-hidden />
                  <p className="text-[0.8125rem] leading-relaxed text-fg-muted">{error}</p>
                </>
              ) : (
                <>
                  <QrCode size={30} className="text-fg-subtle" aria-hidden />
                  <p className="text-[0.8125rem] text-fg-muted">
                    {isEmpty ? 'הדביקו קישור והקוד ייווצר מיד' : 'מחשבים…'}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ScanBadge check={scanCheck} contrast={contrast} visible={!!geo} />
    </div>
  );
}

/**
 * תגית תוצאת בדיקת הסריקה.
 *
 * ממוקמת מתחת לקוד ולא בתוך כרטיס נפרד: זו עובדה על מה שרואים למעלה,
 * ולא הגדרה בפני עצמה.
 */
function ScanBadge({
  check,
  contrast,
  visible,
}: {
  check: ScanCheckState;
  contrast: ScanContrast;
  visible: boolean;
}): ReactNode {
  if (!visible || check === 'idle' || check === 'unknown') return null;

  const state = (():
    | { tone: 'muted' | 'good' | 'warn' | 'bad'; icon: ReactNode; text: string }
    | null => {
    if (check === 'checking') {
      return {
        tone: 'muted',
        icon: <Loader2 size={13} className="animate-spin" aria-hidden />,
        text: 'בודקים סריקה',
      };
    }
    if (check === 'ok') {
      return contrast.risk === 'fair'
        ? {
            tone: 'warn',
            icon: <TriangleAlert size={13} aria-hidden />,
            text: `נסרק, אך הניגודיות נמוכה (${contrast.ratio.toFixed(1)}:1)`,
          }
        : { tone: 'good', icon: <CircleCheck size={13} aria-hidden />, text: 'נבדק ונסרק בהצלחה' };
    }
    return {
      tone: 'bad',
      icon: <TriangleAlert size={13} aria-hidden />,
      text: contrast.risk === 'poor' ? 'הניגודיות נמוכה מדי לסריקה' : 'הקוד לא נקרא בבדיקה',
    };
  })();

  if (!state) return null;

  const tones = {
    muted: 'text-fg-subtle',
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-danger',
  } as const;

  return (
    <motion.p
      key={state.text}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fade}
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-1.5 text-center text-xs font-medium',
        tones[state.tone],
      )}
    >
      {state.icon}
      {state.text}
    </motion.p>
  );
}
