import { motion } from 'framer-motion';
import { Check, Download, Share, SquarePlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/Button';
import { Sheet } from './ui/Sheet';
import { listItem, listParent } from '@/lib/motion';

interface InstallSheetProps {
  open: boolean;
  onClose: () => void;
  /** true = אין `beforeinstallprompt` (iOS) ולכן מוצגות הוראות ידניות */
  manual: boolean;
  onInstall: () => void;
}

const BENEFITS = [
  'נפתח ישירות ממסך הבית, בלי סרגל דפדפן',
  'עובד גם בלי אינטרנט — כל העיצובים זמינים',
  'מקבל קישורים ישירות מתפריט השיתוף של המכשיר',
];

/**
 * הצעת התקנה.
 *
 * מוצגת פעם אחת בלבד, ורק אחרי שהמשתמש כבר יצר קוד — לבקש התקנה לפני
 * שראו מה הכלי עושה זה לבקש מוקדם מדי. הסירוב נשמר ולא חוזר.
 */
export function InstallSheet({ open, onClose, manual, onInstall }: InstallSheetProps): ReactNode {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="להתקין את QR Studio?"
      subtitle="אפליקציה מלאה, בלי חנות אפליקציות"
      footer={
        manual ? (
          <Button variant="soft" size="lg" block onClick={onClose}>
            הבנתי
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ink" size="lg" block onClick={onInstall} icon={<Download size={18} />}>
              התקנה
            </Button>
            <Button variant="ghost" size="lg" onClick={onClose}>
              לא עכשיו
            </Button>
          </div>
        )
      }
    >
      <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-2.5 py-1">
        {BENEFITS.map((benefit) => (
          <motion.li key={benefit} variants={listItem} className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Check size={12} strokeWidth={3} aria-hidden />
            </span>
            <span className="text-[0.875rem] leading-relaxed text-fg-muted">{benefit}</span>
          </motion.li>
        ))}
      </motion.ul>

      {manual && (
        <div className="mt-4 space-y-3 rounded-[var(--radius-tile)] border border-border p-4">
          <p className="text-[0.8125rem] font-bold">להתקנה באייפון:</p>
          <ol className="space-y-2.5">
            <li className="flex items-center gap-2.5 text-[0.875rem] text-fg-muted">
              <Share size={17} className="shrink-0 text-fg" aria-hidden />
              הקישו על כפתור השיתוף בסרגל התחתון
            </li>
            <li className="flex items-center gap-2.5 text-[0.875rem] text-fg-muted">
              <SquarePlus size={17} className="shrink-0 text-fg" aria-hidden />
              בחרו <strong className="font-semibold text-fg">״הוספה למסך הבית״</strong>
            </li>
          </ol>
        </div>
      )}
    </Sheet>
  );
}
