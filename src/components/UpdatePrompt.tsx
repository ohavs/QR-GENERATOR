import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';
import { springSoft } from '@/lib/motion';

/**
 * מודיע כשגרסה חדשה זמינה.
 *
 * העדכון אינו מוחל בכוח: החלפת קובצי JS באמצע עבודה עלולה לאבד את מה
 * שהמשתמש בנה, ולכן ההחלטה נשארת אצלו.
 */
export function UpdatePrompt(): ReactNode {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={springSoft}
          role="status"
          className="safe-b fixed inset-x-4 bottom-4 z-[70] mx-auto flex max-w-[26rem] items-center gap-3 rounded-full border border-border bg-surface p-2 ps-4 shadow-[var(--shadow-pop)]"
        >
          <RefreshCw size={16} className="shrink-0 text-accent" aria-hidden />
          <p className="flex-1 text-[0.875rem] font-medium">גרסה חדשה זמינה</p>
          <Button variant="ink" size="sm" onClick={() => void updateServiceWorker(true)}>
            רענון
          </Button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label="התעלמות מהעדכון"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={15} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
