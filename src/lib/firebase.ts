import { initializeApp, type FirebaseApp } from 'firebase/app';

/**
 * הגדרות Firebase.
 *
 * מפתחות ה-Web של Firebase אינם סוד — הם נחשפים בכל מקרה ללקוח, וההגנה
 * בפועל מגיעה מכללי האבטחה ומהגבלת הדומיינים המורשים בקונסולה. ניתן לדרוס
 * כל ערך דרך משתני סביבה (`.env.local`) בלי לגעת בקוד.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDCw2LROQ9N8Hw2F-LWmnjr5bLv2N4WuDA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'qr-generator-92987.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'qr-generator-92987',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'qr-generator-92987.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '994796178436',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:994796178436:web:4aca80e4217d7ce6ae3951',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-6N1TS54PH1',
};

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig);
  return app;
}

type AnalyticsInstance = Awaited<ReturnType<typeof import('firebase/analytics').getAnalytics>>;
let analyticsPromise: Promise<AnalyticsInstance | null> | null = null;

/**
 * טוען Analytics באופן עצל ורק כשהסביבה תומכת.
 *
 * הטעינה מושהית כדי לא לעכב את הצגת הכלי, ונכשלת בשקט בדפדפנים חוסמים או
 * במצב לא-מקוון — מדידה לעולם לא תפיל את הפיצ'ר עצמו.
 */
function loadAnalytics(): Promise<AnalyticsInstance | null> {
  analyticsPromise ??= (async () => {
    if (typeof window === 'undefined' || !import.meta.env.PROD) return null;
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (!(await isSupported())) return null;
      return getAnalytics(getFirebaseApp());
    } catch {
      return null;
    }
  })();
  return analyticsPromise;
}

/** אירועי המוצר שאנחנו מודדים. */
export type AnalyticsEvent =
  | 'qr_generated'
  | 'design_selected'
  | 'size_selected'
  | 'export_download'
  | 'export_share'
  | 'export_copy'
  | 'logo_added'
  | 'theme_toggled'
  | 'pwa_installed'
  | 'history_restored';

export async function track(
  event: AnalyticsEvent,
  params: Record<string, string | number | boolean> = {},
): Promise<void> {
  try {
    const analytics = await loadAnalytics();
    if (!analytics) return;
    const { logEvent } = await import('firebase/analytics');
    logEvent(analytics, event, params);
  } catch {
    // מדידה היא best-effort בלבד
  }
}
