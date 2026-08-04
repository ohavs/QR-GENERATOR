import { useCallback, useEffect, useState } from 'react';
import { getAuthClient, isBackendUnavailable, markBackendDisabled, type User } from '@/lib/backend';

export type GoogleSignInResult = 'linked' | 'signed-in' | 'switched';

export interface AuthState {
  user: User | null;
  /** true עד שידוע אם יש משתמש מחובר */
  loading: boolean;
  /** true כשהצד השרתי לא הופעל בקונסולה */
  unavailable: boolean;
  /** מחזיר 'linked' כשחשבון אנונימי שודרג ושמר את הקודים שלו */
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * מצב ההתחברות.
 *
 * ההאזנה מתחילה רק בקריאה ראשונה — עמוד שלא נוגע בקודים דינמיים לא טוען את
 * ספריית ההזדהות בכלל.
 *
 * התחברות אנונימית קיימת בכוונה: היא מאפשרת לשמור קודים דינמיים בלי לחסום
 * את הכלי מאחורי הרשמה. החיסרון שלה — איבוד גישה בניקוי נתוני הדפדפן — נאמר
 * למשתמש במפורש בממשק.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const auth = await getAuthClient();
        const { onAuthStateChanged } = await import('firebase/auth');
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, (next) => {
          setUser(next);
          setLoading(false);
        });
      } catch (error) {
        if (!active) return;
        if (isBackendUnavailable(error)) {
          markBackendDisabled();
          setUnavailable(true);
        }
        setLoading(false);
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const handle = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (error) {
      if (isBackendUnavailable(error)) {
        markBackendDisabled();
        setUnavailable(true);
      }
      throw error;
    }
  }, []);

  /**
   * התחברות עם גוגל.
   *
   * כשכבר קיים משתמש אנונימי מבצעים **קישור** ולא התחברות חדשה: התחברות
   * רגילה הייתה מייצרת מזהה משתמש אחר, והקודים הדינמיים שנוצרו קודם היו
   * נשארים תלויים בחשבון הישן — כלומר המשתמש היה מאבד אותם בדיוק ברגע
   * שניסה לאבטח אותם.
   *
   * אם חשבון הגוגל כבר משויך למשתמש אחר, אין ברירה אלא להתחבר רגיל —
   * ואז חשוב לומר לו שהקודים האנונימיים נשארו מאחור.
   */
  const signInWithGoogle = useCallback(async (): Promise<'linked' | 'signed-in' | 'switched'> => {
    const auth = await getAuthClient();
    const { GoogleAuthProvider, linkWithPopup, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;

    if (current?.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
        return 'linked';
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
          if (isBackendUnavailable(error)) {
            markBackendDisabled();
            setUnavailable(true);
          }
          throw error;
        }
        // חשבון הגוגל כבר קיים — מתחברים אליו, והקודים האנונימיים נשארים מאחור
        await signInWithPopup(auth, provider);
        return 'switched';
      }
    }

    await handle(async () => {
      await signInWithPopup(auth, provider);
    });
    return 'signed-in';
  }, [handle]);

  const signInAnonymously = useCallback(async () => {
    await handle(async () => {
      const auth = await getAuthClient();
      const { signInAnonymously: anon } = await import('firebase/auth');
      await anon(auth);
    });
  }, [handle]);

  const signOut = useCallback(async () => {
    const auth = await getAuthClient();
    const { signOut: out } = await import('firebase/auth');
    await out(auth);
  }, []);

  return { user, loading, unavailable, signInWithGoogle, signInAnonymously, signOut };
}
