import { getFirebaseApp } from './firebase';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

/**
 * גישה עצלה ל-Auth ול-Firestore.
 *
 * שתי הספריות נטענות רק כשמשתמש באמת נכנס לתחום הקודים הדינמיים. מי שרק
 * מייצר קוד רגיל — הרוב המוחלט — לא משלם עליהן בכלל, והבטחת הפרטיות של
 * המצב הרגיל נשמרת: בלי חיבור, בלי בקשת רשת.
 */

let authPromise: Promise<Auth> | null = null;
let dbPromise: Promise<Firestore> | null = null;

export async function getAuthClient(): Promise<Auth> {
  authPromise ??= import('firebase/auth').then(({ getAuth }) => getAuth(getFirebaseApp()));
  return authPromise;
}

export async function getDb(): Promise<Firestore> {
  dbPromise ??= import('firebase/firestore').then(({ getFirestore }) =>
    getFirestore(getFirebaseApp()),
  );
  return dbPromise;
}

/** מצב ההפעלה של הצד השרתי. */
export type BackendStatus = 'ready' | 'disabled' | 'unknown';

let cachedStatus: BackendStatus = 'unknown';

/**
 * מסמן שהצד השרתי אינו מופעל.
 *
 * Firestore שלא הופעל בקונסולה מחזיר שגיאת הרשאה, וזה נראה למשתמש כמו תקלה.
 * מצב מפורש מאפשר להציג הסבר במקום הודעת שגיאה גולמית.
 */
export function markBackendDisabled(): void {
  cachedStatus = 'disabled';
}

export function markBackendReady(): void {
  cachedStatus = 'ready';
}

export function backendStatus(): BackendStatus {
  return cachedStatus;
}

/** שגיאה שמשמעה "השירות לא הופעל", להבדיל מתקלה זמנית. */
export function isBackendUnavailable(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code ?? '';
  return (
    code === 'permission-denied' ||
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    code === 'auth/configuration-not-found' ||
    code === 'auth/operation-not-allowed'
  );
}

export type { User };
