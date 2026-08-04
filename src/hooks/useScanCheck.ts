import { useEffect, useState } from 'react';
import type { QrGeometry } from '@/lib/qr/types';
import { verifyScannable, type ScanCheck } from '@/lib/verify';

export type ScanCheckState = ScanCheck | 'checking' | 'idle';

/**
 * מריץ בדיקת סריקה בכל שינוי משמעותי, אחרי השהיה קצרה.
 *
 * הבדיקה מרנדרת ומפענחת מחדש, ולכן היא מושהית ומבוטלת בכל שינוי — אחרת כל
 * גרירה של מחוון הייתה מפעילה עשרות פענוחים.
 */
export function useScanCheck(geo: QrGeometry | null, expected: string, delay = 420): ScanCheckState {
  const [state, setState] = useState<ScanCheckState>('idle');

  useEffect(() => {
    if (!geo || !expected) {
      setState('idle');
      return;
    }

    const controller = new AbortController();
    setState('checking');

    const timer = setTimeout(() => {
      void verifyScannable(geo, expected, controller.signal).then((result) => {
        if (!controller.signal.aborted) setState(result);
      });
    }, delay);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [geo, expected, delay]);

  return state;
}
