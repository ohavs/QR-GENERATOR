import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ScanCheckState } from '@/hooks/useScanCheck';
import type { ScanContrast } from '@/lib/contrast';

interface ScanStatusProps {
  check: ScanCheckState;
  contrast: ScanContrast;
}

/**
 * מציג את תוצאת בדיקת הסריקה בפועל.
 *
 * כשהפענוח נכשל מוצגת גם סיבת הניגודיות, אם היא רלוונטית — זו הסיבה הנפוצה
 * ביותר, והמשתמש צריך לדעת מה לתקן ולא רק שמשהו לא בסדר.
 */
export function ScanStatus({ check, contrast }: ScanStatusProps): ReactNode {
  if (check === 'idle' || check === 'unknown') return null;

  if (check === 'checking') {
    return (
      <Row tone="muted" icon={<Loader2 size={14} className="animate-spin" aria-hidden />}>
        בודקים סריקה…
      </Row>
    );
  }

  if (check === 'ok') {
    const warn = contrast.risk === 'fair';
    return (
      <Row
        tone={warn ? 'warn' : 'good'}
        icon={
          warn ? (
            <TriangleAlert size={14} aria-hidden />
          ) : (
            <CircleCheck size={14} aria-hidden />
          )
        }
      >
        {warn
          ? `נסרק בהצלחה, אבל הניגודיות נמוכה (${contrast.ratio.toFixed(1)}:1) — בהדפסה או בגודל קטן זה עלול להיכשל`
          : 'נבדק ונסרק בהצלחה'}
      </Row>
    );
  }

  return (
    <Row tone="bad" icon={<TriangleAlert size={14} aria-hidden />}>
      {contrast.message ??
        'הקוד לא נקרא בבדיקה. נסו להגדיל את המודולים, להקטין את הלוגו או לבחור צבעים מנוגדים יותר.'}
    </Row>
  );
}

const TONES = {
  good: 'text-success',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-danger',
  muted: 'text-fg-subtle',
} as const;

function Row({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  children: ReactNode;
}): ReactNode {
  return (
    <p
      className={cn(
        'flex items-start gap-1.5 border-t border-border px-4 py-2.5 text-xs font-medium leading-relaxed',
        TONES[tone],
      )}
      role="status"
      aria-live="polite"
    >
      <span className="mt-px shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
