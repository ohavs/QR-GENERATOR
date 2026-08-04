import type { Paint, QrGeometry } from '../types';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * האזורים שעליהם נמתחים גרדיאנטים, ביחידות מודול.
 *
 * שני הרנדררים (SVG ו-Canvas) משתמשים באותם אזורים בדיוק ובקואורדינטות
 * מוחלטות — ולכן גרדיאנט על המסך יוצא זהה לגרדיאנט בקובץ המיוצא.
 */
export function regionsOf(geo: QrGeometry): { board: Region; qr: Region; frame: Region } {
  return {
    board: { x: 0, y: 0, w: geo.boardSize, h: geo.boardHeight },
    qr: { x: geo.offset, y: geo.offset, w: geo.moduleCount, h: geo.moduleCount },
    frame: {
      x: 0,
      y: geo.boardSize,
      w: geo.boardSize,
      h: Math.max(0.001, geo.boardHeight - geo.boardSize),
    },
  };
}

/** ממיר זווית (מעלות) לנקודות התחלה/סוף בתוך אזור נתון. */
export function linearPoints(
  angle: number,
  r: Region,
): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  // חצי-אלכסון מבטיח שהגרדיאנט מכסה את כל האזור בכל זווית
  const half = Math.sqrt(r.w * r.w + r.h * r.h) / 2;
  const dx = (Math.cos(rad) * half) / Math.SQRT2;
  const dy = (Math.sin(rad) * half) / Math.SQRT2;
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
}

export function radialParams(r: Region): { cx: number; cy: number; radius: number } {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, radius: Math.max(r.w, r.h) * 0.72 };
}

/** צבע ייצוגי יחיד עבור צביעה — לשימוש בתצוגות מוקטנות ובמטא-תגיות. */
export function paintToColor(paint: Paint): string {
  return paint.type === 'solid' ? paint.color : paint.stops[0].color;
}
