import { useId, useMemo, type ReactNode } from 'react';
import { toSvg } from '@/lib/qr/render/svg';
import type { QrGeometry } from '@/lib/qr/types';

interface QrSvgProps {
  geo: QrGeometry;
  title?: string;
  className?: string;
}

/**
 * מציג את הקוד כ-SVG חי.
 *
 * המרקאפ נבנה על ידי אותו `toSvg` שמשמש לייצוא קובץ SVG — כך שאין שני
 * מסלולי רינדור שיכולים להיפרד זה מזה.
 */
export function QrSvg({ geo, title = 'קוד QR', className }: QrSvgProps): ReactNode {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const markup = useMemo(
    () => toSvg(geo, { title, idPrefix: `qr${uid}` }),
    [geo, title, uid],
  );

  return (
    <div
      className={className}
      style={{ aspectRatio: `${geo.boardSize} / ${geo.boardHeight}` }}
      // המרקאפ נוצר במלואו על ידי `toSvg`, שמבריח כל ערך שמגיע מהמשתמש.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
