import { renderToCanvas } from '../qr/render/canvas';
import type { QrGeometry } from '../qr/types';
import type { CardTemplate, CardValues, TextElement } from './types';

/**
 * רינדור כרטיס.
 *
 * הכול נמשך על Canvas אחד — גם התצוגה המקדימה וגם קובץ ההדפסה. יכולתי לצייר
 * את התצוגה ב-HTML ואת הייצוא ב-Canvas, אבל אז פריסת הטקסט הייתה מחושבת
 * פעמיים בשני מנועים שונים, והכרטיס שיורד היה נבדל מזה שעל המסך. מנוע אחד
 * מבטיח שמה שרואים הוא מה שמדפיסים.
 *
 * קוד ה-QR מרונדר על ידי מנוע ה-QR הרגיל ומוטבע כתמונה — כך כל עבודת
 * הסריקוּת, הצורות והצבעים חלה על הכרטיס בלי כפילות.
 */

export interface CardRenderOptions {
  /** רוחב היעד בפיקסלים */
  width: number;
  /** משפחת גופן; ברירת מחדל — גופני האפליקציה */
  fonts?: { display: string; sans: string };
}

const DEFAULT_FONTS = {
  display: "'Rubik', system-ui, sans-serif",
  sans: "'Heebo', 'Rubik', system-ui, sans-serif",
};

/** האם הטקסט עברי — קובע את כיוון הציור. */
function isRtl(value: string): boolean {
  return /[֐-׿]/.test(value);
}

/**
 * שובר טקסט לשורות לפי רוחב מרבי.
 *
 * שבירה ידנית ולא `fillText` פשוט: שם ארוך או משפט חופשי חייבים להישבר בתוך
 * הרוחב שהתבנית הקצתה, אחרת הם דורסים את הקוד וגוזלים ממנו את האזור השקט.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let line = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines.slice(0, 3); // מעבר לשלוש שורות הכרטיס כבר לא קריא
}

function drawText(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  value: string,
  unit: number,
  fonts: { display: string; sans: string },
): void {
  if (!value.trim() || element.opacity === 0) return;

  const fontSize = element.size * unit;
  const family = element.font === 'display' ? fonts.display : fonts.sans;

  ctx.save();
  ctx.font = `${element.weight} ${fontSize}px ${family}`;
  ctx.fillStyle = element.color;
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.textBaseline = 'top';
  ctx.direction = isRtl(value) ? 'rtl' : 'ltr';
  if (element.tracking) ctx.letterSpacing = `${element.tracking * unit * 0.1}px`;

  const maxWidth = element.width * unit;
  const lines = wrapText(ctx, value, maxWidth);
  const lineHeight = fontSize * 1.25;

  // המרת יישור לוגי לקואורדינטת ציור. הכרטיס עצמו תמיד LTR מבחינת מיקום —
  // 'start' הוא הקצה השמאלי — אבל הטקסט עצמו מצויר לפי כיוונו שלו.
  const left = element.x * unit;
  let anchorX: number;
  if (element.align === 'center') {
    anchorX = left + maxWidth / 2;
    ctx.textAlign = 'center';
  } else if (element.align === 'end') {
    anchorX = left + maxWidth;
    ctx.textAlign = 'right';
  } else {
    anchorX = left;
    ctx.textAlign = 'left';
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, anchorX, element.y * unit + index * lineHeight);
  });

  ctx.restore();
}

/**
 * מצייר את הכרטיס המלא.
 *
 * `qrOverride` מאפשר למשתמש להזיז ולשנות את גודל הקוד מעל מה שהתבנית קבעה.
 */
export async function renderCard(
  template: CardTemplate,
  values: CardValues,
  qrGeometry: QrGeometry | null,
  qrOverride: { x: number; y: number; size: number } | null,
  options: CardRenderOptions,
): Promise<HTMLCanvasElement> {
  const fonts = options.fonts ?? DEFAULT_FONTS;

  const width = Math.max(1, Math.round(options.width));
  const height = Math.round(width * (template.heightMm / template.widthMm));

  // כל היחידות באחוזים מרוחב הכרטיס — לכן היחידה היא אחוז אחד ברוחב
  const unit = width / 100;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('הדפדפן לא תומך ב-Canvas 2D');

  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, width, height);

  for (const element of template.elements) {
    if (element.kind === 'shape') {
      ctx.save();
      ctx.globalAlpha = element.opacity ?? 1;
      ctx.fillStyle = element.color;
      const path = new Path2D();
      path.roundRect(
        element.x * unit,
        element.y * unit,
        element.width * unit,
        element.height * unit,
        (element.radius ?? 0) * unit,
      );
      ctx.fill(path);
      ctx.restore();
      continue;
    }

    if (element.kind === 'text') {
      drawText(ctx, element, values[element.field] ?? '', unit, fonts);
      continue;
    }

    if (element.kind === 'qr' && qrGeometry) {
      const placement = qrOverride ?? { x: element.x, y: element.y, size: element.size };
      const side = placement.size * unit;

      // רינדור ב-2× מגודל היעד: הקוד מוטבע כתמונה, והמרווח מונע ריכוך בקצוות
      const qrCanvas = await renderToCanvas(qrGeometry, {
        width: Math.max(256, Math.round(side * 2)),
        padColor: template.qrBackground,
      });

      ctx.drawImage(
        qrCanvas,
        placement.x * unit,
        placement.y * unit,
        side,
        side * (qrCanvas.height / qrCanvas.width),
      );
    }
  }

  return canvas;
}

/** ממדי הכרטיס במילימטרים — לייצוא PDF בגודל פיזי מדויק. */
export function cardMillimeters(template: CardTemplate): { widthMm: number; heightMm: number } {
  return { widthMm: template.widthMm, heightMm: template.heightMm };
}

/** רוחב הרינדור שנותן 300DPI עבור מידות הכרטיס. */
export function printWidth(template: CardTemplate): number {
  return Math.round((template.widthMm / 25.4) * 300);
}
