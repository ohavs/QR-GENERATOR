import { ArrowUp, Download } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { QrSvg } from './QrSvg';
import { Button } from './ui/Button';
import type { QrGeometry } from '@/lib/qr/types';

interface MobileActionBarProps {
  geo: QrGeometry | null;
  designName: string;
  busy: boolean;
  onDownload: () => void;
}

/**
 * סרגל פעולה קבוע לנייד.
 *
 * בגלריה ארוכה המשתמש בוחר עיצוב הרחק מטה, ובלי הסרגל הזה הוא נאלץ לגלול
 * חזרה למעלה כדי לראות תוצאה או להוריד. הוא מופיע רק אחרי שהתצוגה המקדימה
 * יצאה מהמסך, כדי לא לחסום את הכלי כשהיא ממילא גלויה.
 */
export function MobileActionBar({
  geo,
  designName,
  busy,
  onDownload,
}: MobileActionBarProps): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById('qr-preview-anchor');
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!geo || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
      style={{ animation: 'in-up 0.3s var(--ease-out-soft) both' }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-surface p-1"
          aria-label="חזרה לתצוגה המקדימה"
        >
          <QrSvg geo={geo} title="תצוגה מוקטנת" className="w-full" />
          <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-opacity hover:bg-black/40 hover:opacity-100">
            <ArrowUp size={16} aria-hidden />
          </span>
        </button>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-fg-subtle">עיצוב נבחר</span>
          <span className="block truncate text-sm font-bold">{designName}</span>
        </span>

        <Button
          variant="primary"
          size="md"
          loading={busy}
          onClick={onDownload}
          icon={<Download size={17} />}
          className="shrink-0"
        >
          הורדה
        </Button>
      </div>
    </div>
  );
}
