import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/Button';

/**
 * מודיע כשגרסה חדשה זמינה, וכשהאפליקציה מוכנה לעבודה במצב לא-מקוון.
 *
 * העדכון אינו מוחל בכוח: החלפת קובצי JS באמצע עבודה עלולה לאבד את מה
 * שהמשתמש בנה, ולכן ההחלטה נשארת אצלו.
 */
export function UpdatePrompt(): ReactNode {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    if (!offlineReady || dismissedOffline) return;
    const id = setTimeout(() => {
      setOfflineReady(false);
      setDismissedOffline(true);
    }, 4500);
    return () => clearTimeout(id);
  }, [offlineReady, dismissedOffline, setOfflineReady]);

  const show = needRefresh || offlineReady;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)] sm:inset-x-auto sm:end-6"
        >
          {needRefresh ? (
            <>
              <RefreshCw size={18} className="shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-sm font-medium">גרסה חדשה זמינה</p>
              <Button size="sm" variant="primary" onClick={() => void updateServiceWorker(true)}>
                רענון
              </Button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                aria-label="התעלמות מהעדכון"
                className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X size={15} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <WifiOff size={18} className="shrink-0 text-success" aria-hidden />
              <p className="flex-1 text-sm font-medium">האפליקציה מוכנה לעבודה גם ללא אינטרנט</p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
