import { motion } from 'framer-motion';
import { Check, Copy, Download, Share2 } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { canShareFiles } from '@/lib/export';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import type { ExportActions } from '@/hooks/useExportActions';
import type { ExportMode } from './sheets/ExportSheet';

interface ExportDockProps {
  actions: ExportActions;
  onOpenExport: (mode: ExportMode) => void;
}

/**
 * רציף הייצוא — נצמד לתחתית המסך.
 *
 * שלוש פעולות ביחידה אחת: כפתור ראשי מלא ושתי פעולות משניות שחולקות איתו
 * מעטפת אחת עם מפרידי שיער. שלושה כפתורים נפרדים באותו גובה קראו כשלוש
 * החלטות שוות ערך, בעוד שההורדה היא הפעולה, והשאר קיצורי דרך.
 */
export function ExportDock({ actions, onOpenExport }: ExportDockProps): ReactNode {
  const { busy, disabled, runCopy } = actions;
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    await runCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      style={{ '--pb-safe': '0.75rem' } as CSSProperties}
      className="pb-safe sticky bottom-0 z-30 -mx-4 mt-2 bg-bg/85 px-4 pt-2.5 backdrop-blur-xl"
    >
      <div
        className={cn(
          'flex h-13 items-stretch overflow-hidden rounded-full bg-ink text-ink-fg',
          'transition-opacity duration-200',
          disabled && 'pointer-events-none opacity-40',
        )}
      >
        <motion.button
          type="button"
          onClick={() => onOpenExport('download')}
          whileTap={{ scale: 0.97 }}
          transition={springSnappy}
          className="flex flex-1 items-center justify-center gap-2 text-[0.9375rem] font-semibold"
        >
          <Download size={18} aria-hidden />
          הורדה
        </motion.button>

        {canShareFiles() && (
          <DockAction label="שיתוף הקוד" onClick={() => onOpenExport('share')}>
            <Share2 size={17} aria-hidden />
          </DockAction>
        )}

        <DockAction label="העתקת התמונה" onClick={() => void copy()} busy={busy === 'copy'}>
          <motion.span
            key={copied ? 'done' : 'idle'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springSnappy}
            className="grid place-items-center"
          >
            {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
          </motion.span>
        </DockAction>
      </div>
    </div>
  );
}

/** פעולה משנית בתוך הרציף — רוחב קבוע, מופרדת בקו שיער ולא ברווח. */
function DockAction({
  label,
  onClick,
  busy,
  children,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      whileTap={{ scale: 0.9 }}
      transition={springSnappy}
      className="grid w-13 shrink-0 place-items-center border-s border-ink-fg/15 disabled:opacity-50"
    >
      {children}
    </motion.button>
  );
}
