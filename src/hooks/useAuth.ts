import { useCallback, useEffect, useState } from 'react';
import { getAuthClient, isBackendUnavailable, markBackendDisabled, type User } from '@/lib/backend';

export interface AuthState {
  user: User | null;
  /** true עד שידוע אם יש משתמש מחובר */
  loading: boolean;
  /** true כשהצד השרתי לא הופעל בקונסולה */
  unavailable: boolean;
  signInWithGoogle: () => Promise<void>;
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

  const signInWithGoogle = useCallback(async () => {
    await handle(async () => {
      const auth = await getAuthClient();
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      await signInWithPopup(auth, new GoogleAuthProvider());
    });
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
