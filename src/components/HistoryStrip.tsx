import { AnimatePresence, motion } from 'framer-motion';
import { History, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { DESIGN_BY_ID } from '@/lib/qr/presets';
import type { HistoryEntry } from '@/lib/storage';
import { shortenForDisplay } from '@/lib/url';

interface HistoryStripProps {
  entries: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistoryStrip({ entries, onRestore, onRemove, onClear }: HistoryStripProps): ReactNode {
  if (!entries.length) return null;

  return (
    <section className="space-y-2.5" aria-labelledby="history-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="history-title" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-fg-subtle">
          <History size={13} aria-hidden />
          נוצרו לאחרונה
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-fg-subtle transition-colors hover:text-danger"
        >
          ניקוי
        </button>
      </div>

      <div className="scroll-fade -mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, width: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="group relative shrink-0"
            >
              <button
                type="button"
                onClick={() => onRestore(entry)}
                className="flex h-11 max-w-56 items-center gap-2 rounded-xl border border-border bg-surface pe-8 ps-2.5 text-start transition-all duration-200 hover:border-primary hover:shadow-[var(--shadow-sm)]"
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-lg border border-black/10"
                  style={{ background: entry.swatch }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold" dir="ltr">
                    {shortenForDisplay(entry.value, 24)}
                  </span>
                  <span className="block truncate text-[10px] text-fg-subtle">
                    {DESIGN_BY_ID.get(entry.designId)?.name ?? 'עיצוב'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`הסרת ${shortenForDisplay(entry.value, 24)} מההיסטוריה`}
                className="absolute end-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-fg-subtle opacity-0 transition-opacity hover:bg-surface-2 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
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
