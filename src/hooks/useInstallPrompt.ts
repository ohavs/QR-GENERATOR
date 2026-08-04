import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'qr-studio:install-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export interface InstallState {
  /** אפשר להציע התקנה — או דרך הדפדפן, או בהוראות ידניות */
  available: boolean;
  /** אין API להתקנה (iOS) — צריך להסביר ידנית */
  manual: boolean;
  installed: boolean;
  dismissed: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
}

/**
 * זמינות ההתקנה.
 *
 * ב-Chrome/Edge מגיע `beforeinstallprompt` ואפשר לפתוח את דיאלוג ההתקנה
 * המקורי. ב-iOS אין API כזה בכלל, ולכן מוחזר `manual` והממשק מסביר את
 * הדרך הידנית במקום להעמיד פנים שיש כפתור.
 */
export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1',
  );

  useEffect(() => {
    const onPrompt = (e: Event): void => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === 'accepted';
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // מצב פרטי — הסירוב פשוט לא ישרוד רענון
    }
  }, []);

  const manual = isIos() && !deferred;

  return {
    available: !installed && (!!deferred || (isIos() && !installed)),
    manual,
    installed,
    dismissed,
    install,
    dismiss,
  };
}
