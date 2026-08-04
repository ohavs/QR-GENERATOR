/**
 * הסרת רקע אוטומטית מלוגו.
 *
 * רוב הלוגואים מגיעים כ-PNG או JPG עם רקע לבן אחיד, ועל קוד צבעוני הריבוע
 * הלבן הזה בולט וזול. הפונקציות כאן מסירות אותו בדפדפן, בלי שרת ובלי מודל.
 *
 * שלוש החלטות שקובעות את האיכות:
 *
 * 1. **מילוי משטח מהשוליים, לא התאמת צבע גלובלית.** אילו היינו מוחקים כל פיקסל
 *    לבן, טקסט לבן בתוך עיגול כהה היה נעלם. מילוי משטח מתחיל מקצוות התמונה
 *    ומתפשט פנימה, ולכן הוא נוגע רק ברקע שבאמת מחובר לשוליים.
 * 2. **קצה רך.** פיקסלים על גבול הצורה מקבלים שקיפות חלקית לפי מרחקם מצבע
 *    הרקע, אחרת נוצר "מדרגות" מרובע סביב כל עקומה.
 * 3. **ביטול השזירה בקצה.** פיקסל שהיה מעורבב עם לבן נשאר בהיר מדי גם אחרי
 *    שהפכנו אותו לחצי-שקוף, וזה מייצר הילה לבנה. מחשבים בחזרה את הצבע
 *    המקורי: `c = (c_נצפה − רקע × (1 − α)) / α`.
 */

/** גודל מרבי לעיבוד — לוגו גדול יותר מוקטן קודם, כדי לא לתקוע את הדפדפן. */
const MAX_EDGE = 768;

export type BackgroundStrength = 'gentle' | 'normal' | 'strong';

/** סף מרחק צבע (0–255 לערוץ, מרחק אוקלידי) לכל עוצמה. */
const TOLERANCE: Record<BackgroundStrength, number> = {
  gentle: 28,
  normal: 52,
  strong: 84,
};

interface Rgb {
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

function colorDistance(a: Rgb, r: number, g: number, b: number): number {
  const dr = a.r - r;
  const dg = a.g - g;
  const db = a.b - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * מזהה את צבע הרקע מתוך מסגרת הפיקסלים החיצונית.
 *
 * הצבעים מקובצים לדליים גסים כדי שרעש JPEG לא יפצל גוון אחד לעשרות ערכים,
 * ואז נבחר הדלי הנפוץ ביותר — ומוחזר ממוצע הפיקסלים שבתוכו.
 */
function detectBackground(data: Uint8ClampedArray, width: number, height: number): Rgb | null {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();

  const sample = (x: number, y: number): void => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 200) return; // כבר שקוף — לא מייצג רקע
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  };

  for (let x = 0; x < width; x++) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    sample(0, y);
    sample(width - 1, y);
  }

  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return null;

  const border = width * 2 + (height - 2) * 2;
  // רקע אמיתי תופס חלק ניכר מהמסגרת. אחרת כנראה שאין רקע אחיד להסיר.
  if (best.count < border * 0.35) return null;

  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
  };
}

export interface RemoveBackgroundResult {
  /** data: URL של PNG עם ערוץ אלפא */
  src: string;
  /** false = לא נמצא רקע אחיד שכדאי להסיר */
  changed: boolean;
}

/**
 * מסיר את הרקע ומחזיר PNG שקוף.
 *
 * כשלא מזוהה רקע אחיד מוחזרת התמונה המקורית עם `changed: false` — עדיף לומר
 * למשתמש שאין מה להסיר מאשר לחורר לו את הלוגו.
 */
export async function removeBackground(
  src: string,
  strength: BackgroundStrength = 'normal',
): Promise<RemoveBackgroundResult> {
  const image = await loadImage(src);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('הדפדפן לא תומך ב-Canvas 2D');

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const background = detectBackground(data, width, height);
  if (!background) return { src, changed: false };

  const tolerance = TOLERANCE[strength];
  const soft = tolerance * 1.9; // מעבר לסף הזה הפיקסל נחשב חלק מהלוגו

  /* ── מילוי משטח מהשוליים ─────────────────────────────────────────── */
  const total = width * height;
  const visited = new Uint8Array(total);
  const stack: number[] = [];

  const push = (index: number): void => {
    if (visited[index]) return;
    const i = index * 4;
    if (colorDistance(background, data[i], data[i + 1], data[i + 2]) > tolerance) return;
    visited[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (stack.length) {
    const index = stack.pop()!;
    const x = index % width;
    const y = (index - x) / width;

    data[index * 4 + 3] = 0;

    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }

  /* ── קצה רך + ביטול שזירה ────────────────────────────────────────── */
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const i = index * 4;
      if (data[i + 3] === 0) continue;

      // רק פיקסלים שנוגעים באזור שהוסר מקבלים טיפול קצה
      const touchesRemoved =
        (x > 0 && data[(index - 1) * 4 + 3] === 0) ||
        (x < width - 1 && data[(index + 1) * 4 + 3] === 0) ||
        (y > 0 && data[(index - width) * 4 + 3] === 0) ||
        (y < height - 1 && data[(index + width) * 4 + 3] === 0);
      if (!touchesRemoved) continue;

      const distance = colorDistance(background, data[i], data[i + 1], data[i + 2]);
      if (distance >= soft) continue;

      const alpha = Math.max(0, Math.min(1, (distance - tolerance) / (soft - tolerance)));
      if (alpha <= 0) {
        data[i + 3] = 0;
        continue;
      }

      // c = (c_נצפה − רקע × (1 − α)) / α — מחזיר את הצבע שלפני השזירה עם הרקע
      data[i] = Math.max(0, Math.min(255, (data[i] - background.r * (1 - alpha)) / alpha));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - background.g * (1 - alpha)) / alpha));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - background.b * (1 - alpha)) / alpha));
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { src: canvas.toDataURL('image/png'), changed: true };
}
