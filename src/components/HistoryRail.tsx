import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { springSnappy } from '@/lib/motion';
import type { HistoryEntry } from '@/lib/storage';
import { shortenForDisplay } from '@/lib/url';

interface HistoryRailProps {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
}

/** הקודים האחרונים — שורה נגללת, לא רשימה שתופסת מסך. */
export function HistoryRail({ entries, onRestore, onRemove }: HistoryRailProps): ReactNode {
  if (!entries.length) return null;

  return (
    <section aria-labelledby="history-title" className="space-y-2">
      <h2 id="history-title" className="px-1 text-[0.8125rem] font-bold text-fg-muted">
        נוצרו לאחרונה
      </h2>

      <div className="rail -mx-4 flex gap-2 px-4 pb-1">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={springSnappy}
              className="group relative shrink-0"
            >
              <motion.button
                type="button"
                onClick={() => onRestore(entry)}
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                className="flex h-11 max-w-[13rem] items-center gap-2 rounded-full border border-border bg-surface pe-9 ps-3 text-start transition-colors hover:border-fg"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                  style={{ background: entry.swatch }}
                  aria-hidden
                />
                <span className="truncate text-[0.8125rem] font-medium" dir="ltr">
                  {shortenForDisplay(entry.value, 22)}
                </span>
              </motion.button>

              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`הסרת ${shortenForDisplay(entry.value, 22)} מההיסטוריה`}
                className="absolute end-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <X size={13} aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
