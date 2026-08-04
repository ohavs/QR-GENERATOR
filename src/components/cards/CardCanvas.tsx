import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { renderCard } from '@/lib/cards/render';
import type { CardTemplate, CardValues } from '@/lib/cards/types';
import type { QrGeometry } from '@/lib/qr/types';

interface CardCanvasProps {
  template: CardTemplate;
  values: CardValues;
  geometry: QrGeometry | null;
  qrOverride: { x: number; y: number; size: number } | null;
  /** רוחב הרינדור בפיקסלים — גבוה יותר לתצוגה חדה במסכי רטינה */
  width?: number;
  /** 'ghost' = דוגמאות בשקיפות, 'solid' = כמו תוכן אמיתי (לגלריה) */
  placeholders?: 'none' | 'solid' | 'ghost';
  className?: string;
}

/**
 * מצייר כרטיס על Canvas ומציג אותו.
 *
 * הרינדור מושהה בפריים אחד ומבוטל בשינוי, כדי שהקלדה בטופס לא תפעיל עשרות
 * רינדורים מלאים — כל אחד מהם כולל רינדור מחדש של קוד ה-QR.
 */
export function CardCanvas({
  template,
  values,
  geometry,
  qrOverride,
  width = 900,
  placeholders = 'none',
  className,
}: CardCanvasProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      void renderCard(template, values, geometry, qrOverride, { width, placeholders })
        .then((canvas) => {
          if (cancelled || !hostRef.current) return;
          canvas.className = 'block h-auto w-full';
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `תצוגה מקדימה של כרטיס ${template.name}`);
          hostRef.current.replaceChildren(canvas);
          setReady(true);
        })
        .catch(() => {
          // כשל רינדור משאיר את הכרטיס הקודם על המסך — עדיף מלמסך ריק
        });
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [template, values, geometry, qrOverride, width, placeholders]);

  return (
    <div
      ref={hostRef}
      className={cn(
        'overflow-hidden rounded-[var(--radius-tile)] transition-opacity duration-200',
        ready ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{ aspectRatio: `${template.widthMm} / ${template.heightMm}` }}
    />
  );
}
