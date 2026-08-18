import { renderToCanvas } from '../qr/render/canvas';
import { linearPoints, radialParams, type Region } from '../qr/render/common';
import type { Paint, QrGeometry } from '../qr/types';
import type { CardTemplate, CardValues, ItemsElement, ShapeElement, TextElement } from './types';

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
  /**
   * ממלא שדות ריקים בערכי הדוגמה של התבנית.
   *
   * חובה בגלריה — תבנית עם שדות ריקים נראית כמו כרטיס ריק, והמשתמש לא יכול
   * לבחור בין שמונה מלבנים לבנים. **אסור בייצוא**: אף אחד לא רוצה להדפיס
   * מאתיים כרטיסים שכתוב עליהם "דנה כהן".
   */
  placeholders?: 'none' | 'solid' | 'ghost';
}

const DEFAULT_FONTS = {
  display: "'Rubik', system-ui, sans-serif",
  sans: "'Heebo', 'Rubik', system-ui, sans-serif",
};

/** האם הטקסט עברי — קובע את כיוון הציור. */
function isRtl(value: string): boolean {
  return /[֐-׿]/.test(value);
}

function toCanvasPaint(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  region: Region,
): string | CanvasGradient {
  if (paint.type === 'solid') return paint.color;
  if (paint.type === 'linear') {
    const { x1, y1, x2, y2 } = linearPoints(paint.angle, region);
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const stop of paint.stops) gradient.addColorStop(stop.offset, stop.color);
    return gradient;
  }
  const { cx, cy, radius } = radialParams(region);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (const stop of paint.stops) gradient.addColorStop(stop.offset, stop.color);
  return gradient;
}

/**
 * שובר טקסט לשורות לפי רוחב מרבי.
 *
 * שבירה ידנית ולא `fillText` פשוט: שם ארוך או משפט חופשי חייבים להישבר בתוך
 * הרוחב שהתבנית הקצתה, אחרת הם דורסים את הקוד וגוזלים ממנו את האזור השקט.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
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
  return lines.slice(0, maxLines);
}

function drawText(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  value: string,
  unit: number,
  fonts: { display: string; sans: string },
  ghost: boolean,
): void {
  if (!value.trim() || element.opacity === 0) return;

  const fontSize = element.size * unit;
  const family = element.font === 'display' ? fonts.display : fonts.sans;

  ctx.save();
  ctx.font = `${element.weight} ${fontSize}px ${family}`;
  ctx.fillStyle = element.color;
  ctx.globalAlpha = (element.opacity ?? 1) * (ghost ? 0.34 : 1);
  ctx.textBaseline = 'top';
  ctx.direction = isRtl(value) ? 'rtl' : 'ltr';
  if (element.tracking) ctx.letterSpacing = `${element.tracking * unit}px`;

  const maxWidth = element.width * unit;
  const lines = wrapText(ctx, value, maxWidth, element.maxLines ?? 2);
  const lineHeight = fontSize * (element.lineHeight ?? 1.22);

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

function drawShape(ctx: CanvasRenderingContext2D, element: ShapeElement, unit: number): void {
  const x = element.x * unit;
  const y = element.y * unit;
  const w = element.width * unit;
  const h = element.height * unit;

  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.fillStyle = toCanvasPaint(ctx, element.fill, { x, y, w, h });

  const path = new Path2D();
  if (element.shape === 'ellipse') {
    path.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    path.roundRect(x, y, w, h, (element.radius ?? 0) * unit);
  }
  ctx.fill(path);
  ctx.restore();
}

/**
 * מפרק שורת פריט ל"שם" ו"מחיר".
 *
 * המפריד הוא הקו האנכי, עם נפילה לרווח-מקף-רווח כי זה מה שאנשים מקלידים
 * באופן טבעי. שורה בלי מפריד היא פריט בלי מחיר, ולא שגיאה.
 */
export function parseItemRow(line: string): { name: string; price: string } {
  const match = /^(.*?)\s*(?:\||\s-\s|\t)\s*([^|\t]*)$/.exec(line.trim());
  if (!match) return { name: line.trim(), price: '' };
  return { name: match[1].trim(), price: match[2].trim() };
}

function drawItems(
  ctx: CanvasRenderingContext2D,
  element: ItemsElement,
  raw: string,
  unit: number,
  fonts: { display: string; sans: string },
  ghost: boolean,
): void {
  const rows = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, element.maxRows)
    .map(parseItemRow);
  if (!rows.length) return;

  const fontSize = element.size * unit;
  const family = element.font === 'display' ? fonts.display : fonts.sans;
  const left = element.x * unit;
  const right = (element.x + element.width) * unit;

  ctx.save();
  ctx.globalAlpha = ghost ? 0.34 : 1;
  ctx.textBaseline = 'top';
  ctx.font = `${element.weight} ${fontSize}px ${family}`;

  rows.forEach((row, index) => {
    const y = (element.y + index * element.rowHeight) * unit;

    ctx.direction = isRtl(row.name) ? 'rtl' : 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = element.color;
    ctx.fillText(row.name, left, y);
    const nameWidth = ctx.measureText(row.name).width;

    if (!row.price) return;

    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.fillStyle = element.priceColor ?? element.color;
    ctx.fillText(row.price, right, y);
    const priceWidth = ctx.measureText(row.price).width;

    // קו נקודות בין השם למחיר — הפרט שהופך רשימה לתפריט
    if (element.leader) {
      const gapStart = left + nameWidth + fontSize * 0.4;
      const gapEnd = right - priceWidth - fontSize * 0.4;
      if (gapEnd > gapStart) {
        ctx.save();
        ctx.globalAlpha = (ghost ? 0.34 : 1) * 0.35;
        ctx.strokeStyle = element.color;
        ctx.lineWidth = Math.max(0.6, fontSize * 0.055);
        ctx.setLineDash([ctx.lineWidth, ctx.lineWidth * 3]);
        ctx.beginPath();
        ctx.moveTo(gapStart, y + fontSize * 0.72);
        ctx.lineTo(gapEnd, y + fontSize * 0.72);
        ctx.stroke();
        ctx.restore();
      }
    }
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
  const placeholders = options.placeholders ?? 'none';

  const width = Math.max(1, Math.round(options.width));
  const height = Math.round(width * (template.heightMm / template.widthMm));

  // כל היחידות באחוזים מרוחב הכרטיס — לכן היחידה היא אחוז אחד ברוחב
  const unit = width / 100;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('הדפדפן לא תומך ב-Canvas 2D');

  ctx.fillStyle = toCanvasPaint(ctx, template.background, { x: 0, y: 0, w: width, h: height });
  ctx.fillRect(0, 0, width, height);

  for (const element of template.elements) {
    if (element.kind === 'shape') {
      drawShape(ctx, element, unit);
      continue;
    }

    if (element.kind === 'text') {
      if (element.field === null) {
        drawText(ctx, element, element.text ?? '', unit, fonts, false);
        continue;
      }
      const filled = (values[element.field] ?? '').trim();
      if (filled) {
        drawText(ctx, element, filled, unit, fonts, false);
      } else if (placeholders !== 'none') {
        const sample = template.sample[element.field] ?? '';
        drawText(ctx, element, sample, unit, fonts, placeholders === 'ghost');
      }
      continue;
    }

    if (element.kind === 'items') {
      const filled = (values[element.field] ?? '').trim();
      if (filled) {
        drawItems(ctx, element, filled, unit, fonts, false);
      } else if (placeholders !== 'none') {
        drawItems(ctx, element, template.sample[element.field] ?? '', unit, fonts, placeholders === 'ghost');
      }
      continue;
    }

    if (element.kind === 'qr' && qrGeometry) {
      const placement = qrOverride ?? { x: element.x, y: element.y, size: element.size };
      const side = placement.size * unit;

      if (element.plate) {
        const pad = element.plate.padding * unit;
        ctx.save();
        ctx.fillStyle = element.plate.fill;
        const plate = new Path2D();
        plate.roundRect(
          placement.x * unit - pad,
          placement.y * unit - pad,
          side + pad * 2,
          side + pad * 2,
          element.plate.radius * unit,
        );
        ctx.fill(plate);
        ctx.restore();
      }

      // רינדור ב-2× מגודל היעד: הקוד מוטבע כתמונה, והמרווח מונע ריכוך בקצוות
      const qrCanvas = await renderToCanvas(qrGeometry, {
        width: Math.max(256, Math.round(side * 2)),
        padColor: element.plate?.fill ?? null,
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
