import { useCallback, useRef } from 'react';

/**
 * מביא את הפריט הנבחר לתוך התצוגה בשורה נגללת.
 *
 * שורות הצ'יפים ארוכות מרוחב המסך, וברירת המחדל היא להתחיל מההתחלה — כך
 * שהערך שנבחר קודם עלול להיות מחוץ למסך ברגע שפותחים את הגיליון. הגלילה
 * מוגבלת לציר האופקי (`block: 'nearest'`) כדי לא להזיז את העמוד עצמו.
 */
export function useScrollIntoView<T extends HTMLElement>(): (node: T | null) => void {
  const done = useRef(false);

  return useCallback((node: T | null) => {
    if (!node || done.current) return;
    done.current = true;
    // ממתינים לפריים אחד כדי שהגיליון יסיים את אנימציית הכניסה
    requestAnimationFrame(() => {
      node.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }, []);
}
