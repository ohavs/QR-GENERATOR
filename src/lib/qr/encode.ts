import { create } from 'qrcode';
import type { EcLevel } from './types';

/** מטריצת המודולים של הקוד, עם עזרי שאילתה. */
export interface QrMatrix {
  size: number;
  /** האם המודול דלוק */
  get: (x: number, y: number) => boolean;
  /** האם המודול שייך לאחת משלוש תבניות האיתור (כולל האזור השקט שלהן) */
  isFinder: (x: number, y: number) => boolean;
}

const FINDER = 7;

/**
 * מקודד טקסט למטריצת QR.
 *
 * זורק שגיאה כאשר הטקסט ארוך מדי לרמת תיקון השגיאות שנבחרה — הקורא אחראי
 * להציג הודעה, ולא להציג קוד שגוי.
 */
export function encode(value: string, ecLevel: EcLevel): QrMatrix {
  const qr = create(value, { errorCorrectionLevel: ecLevel });
  const size = qr.modules.size;
  const data = qr.modules.data;

  const finderOrigins: Array<[number, number]> = [
    [0, 0],
    [size - FINDER, 0],
    [0, size - FINDER],
  ];

  return {
    size,
    get: (x, y) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return false;
      return data[y * size + x] === 1;
    },
    isFinder: (x, y) =>
      finderOrigins.some(([ox, oy]) => x >= ox && x < ox + FINDER && y >= oy && y < oy + FINDER),
  };
}

export const FINDER_SIZE = FINDER;
export const FINDER_ORIGINS = (size: number): Array<[number, number]> => [
  [0, 0],
  [size - FINDER, 0],
  [0, size - FINDER],
];
