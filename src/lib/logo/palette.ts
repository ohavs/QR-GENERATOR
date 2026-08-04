import { contrastRatio, relativeLuminance } from '../contrast';

/**
 * חילוץ פלטת צבעים מלוגו.
 *
 * המטרה המעשית: להפוך "לוגו על קוד סגול גנרי" ל"קוד בצבעי המותג" בלחיצה
 * אחת. לכן לא מספיק למצוא את הצבעים הנפוצים — צריך למצוא צבעים שגם *עובדים*
 * כצבע קוד, כלומר כהים מספיק מול הרקע כדי להיסרק.
 *
 * שלושה סינונים שמפרידים בין "הצבעים בתמונה" לבין "צבעי המותג":
 *
 * 1. **פיקסלים שקופים ורקע** — מדולגים. אחרת הצבע הדומיננטי בכל לוגו הוא לבן.
 * 2. **אפורים חסרי רוויה** — מדולגים. שחור, לבן ואפור קיימים בכל תמונה ולא
 *    מאפיינים מותג.
 * 3. **ניגודיות מול הרקע** — צבע שלא יעבור את סף הסריקה לא מוצע כלל.
 */

const MAX_EDGE = 160;
const BUCKET_BITS = 4; // 16 רמות לערוץ — מאחד גוונים קרובים לדלי אחד

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('טעינת התמונה נכשלה'));
    img.src = src;
  });
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** רוויה במרחב HSL — 0 לאפור מוחלט. */
function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** גוון במעלות — לפיזור ההצעות על פני הגלגל. */
function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * מזיז צבע עד שהוא עובר את סף הניגודיות מול הרקע.
 *
 * הכיוון נקבע לפי הרקע ולא קבוע מראש: מול רקע בהיר מכהים, ומול רקע כהה
 * מבהירים. הכהיה מול רקע כהה הייתה מחזירה גוון כמעט-שחור — פחות קריא
 * מהצבע המקורי, ובדיוק ההפך ממה שנדרש.
 */
function adjustUntilReadable(r: number, g: number, b: number, background: string): string {
  const lighten = relativeLuminance(background) < 0.35;

  let current: [number, number, number] = [r, g, b];
  for (let i = 0; i < 14; i++) {
    const hex = toHex(...current);
    if (contrastRatio(hex, background) >= 4.5) return hex;
    current = lighten
      ? [
          current[0] + (255 - current[0]) * 0.16,
          current[1] + (255 - current[1]) * 0.16,
          current[2] + (255 - current[2]) * 0.16,
        ]
      : [current[0] * 0.86, current[1] * 0.86, current[2] * 0.86];
  }
  return toHex(...current);
}

export interface PaletteOptions {
  /** הרקע שהצבעים צריכים לעבוד מולו */
  background?: string;
  /** כמה צבעים להחזיר */
  limit?: number;
}

/**
 * מחזיר צבעים מהלוגו שמתאימים לשמש כצבע הקוד.
 *
 * צבע שלא עובר את סף הניגודיות לא נפסל אלא מותאם — מוכהה מול רקע בהיר או
 * מובהר מול רקע כהה. משתמש שמעלה לוגו צהוב מצפה לראות הצעה בגוון שלו,
 * לא רשימה ריקה.
 */
export async function extractPalette(
  src: string,
  { background = '#FFFFFF', limit = 5 }: PaletteOptions = {},
): Promise<string[]> {
  const image = await loadImage(src);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const backgroundLuminance = relativeLuminance(background);
  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 160) continue; // שקוף — לא חלק מהלוגו

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (saturation(r, g, b) < 0.18) continue; // אפור — לא מאפיין מותג

    // צבע שנבלע ברקע לא יכול לשמש כצבע קוד
    if (Math.abs(relativeLuminance(toHex(r, g, b)) - backgroundLuminance) < 0.06) continue;

    const key =
      ((r >> (8 - BUCKET_BITS)) << (BUCKET_BITS * 2)) |
      ((g >> (8 - BUCKET_BITS)) << BUCKET_BITS) |
      (b >> (8 - BUCKET_BITS));

    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .map((bucket) => ({
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
      count: bucket.count,
    }));

  // פיזור על גלגל הגוונים — בלי זה חמש ההצעות יוצאות חמישה גוונים של אותו כחול
  const picked: Array<{ r: number; g: number; b: number }> = [];
  for (const candidate of ranked) {
    const candidateHue = hue(candidate.r, candidate.g, candidate.b);
    const tooClose = picked.some((p) => {
      const delta = Math.abs(hue(p.r, p.g, p.b) - candidateHue);
      return Math.min(delta, 360 - delta) < 25;
    });
    if (tooClose) continue;
    picked.push(candidate);
    if (picked.length >= limit) break;
  }

  return picked.map((c) => adjustUntilReadable(c.r, c.g, c.b, background));
}
