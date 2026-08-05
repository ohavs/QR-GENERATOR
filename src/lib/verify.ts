import { renderToCanvas } from './qr/render/canvas';
import type { QrGeometry } from './qr/types';

/**
 * בדיקת סריקוּת אמיתית: מרנדרים את הקוד בגודל שמדמה פריים של מצלמת טלפון
 * ומנסים לפענח אותו בחזרה.
 *
 * הרזולוציה נגזרת ממספר המודולים ולא קבועה. רוחב קבוע של 480px נראה כמו
 * "תנאים מציאותיים", אבל הוא מודד שני דברים שונים בשני קודים שונים: בקוד קצר
 * הוא נותן 14 פיקסלים למודול ובקוד של 300 תווים רק 4 — ואז כל תוכן ארוך
 * מסומן כ"לא נקרא" גם כשהקובץ שיורד בפועל נסרק מצוין. מה שקבוע בפיזיקה הוא
 * מספר הפיקסלים למודול, לא רוחב התמונה.
 */

export type ScanCheck = 'ok' | 'risky' | 'unknown';

/**
 * פיקסלים למודול בבדיקה.
 *
 * שמונה הוא מה שמצלמת טלפון מספקת כשהקוד ממלא חלק סביר מהפריים. מתחת לזה
 * נכשלים גם קודים תקינים לחלוטין, ומעל זה הבדיקה נעשית סלחנית מדי.
 */
const PIXELS_PER_MODULE = 8;

/** חסמים: קוד זעיר לא ייבדק בתמונה קטנה מדי, וקוד ענק לא ינפח את הזיכרון. */
const MIN_WIDTH = 320;
const MAX_WIDTH = 1600;

/** רוחב הבדיקה עבור לוח בגודל נתון (ביחידות מודול). */
export function frameWidthFor(boardSize: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, boardSize * PIXELS_PER_MODULE)));
}

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

let nativeDetector: BarcodeDetectorLike | null | undefined;

/** גלאי הברקודים המובנה בדפדפן — כשהוא קיים, אין צורך לטעון ספרייה כלל. */
async function getNativeDetector(): Promise<BarcodeDetectorLike | null> {
  if (nativeDetector !== undefined) return nativeDetector;
  try {
    const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor) {
      nativeDetector = null;
      return null;
    }
    nativeDetector = new ctor({ formats: ['qr_code'] });
    return nativeDetector;
  } catch {
    nativeDetector = null;
    return null;
  }
}

async function decodeWithJsQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { default: jsQR } = await import('jsqr');
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(image.data, canvas.width, canvas.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data ?? null;
}

/**
 * מוודא שהקוד שנוצר מפוענח בחזרה לערך המקורי.
 *
 * מחזיר `unknown` כשאין דרך לפענח בסביבה הנוכחית — עדיף לא להציג שום דבר
 * מאשר להציג אזהרה שקרית.
 */
export async function verifyScannable(
  geo: QrGeometry,
  expected: string,
  signal?: AbortSignal,
): Promise<ScanCheck> {
  try {
    const canvas = await renderToCanvas(geo, {
      width: frameWidthFor(geo.boardSize),
      padColor: geo.background ? undefined : '#FFFFFF',
    });
    if (signal?.aborted) return 'unknown';

    const native = await getNativeDetector();
    if (native) {
      const found = await native.detect(canvas);
      if (signal?.aborted) return 'unknown';
      return found.some((b) => b.rawValue === expected) ? 'ok' : 'risky';
    }

    const decoded = await decodeWithJsQr(canvas);
    if (signal?.aborted) return 'unknown';
    return decoded === expected ? 'ok' : 'risky';
  } catch {
    return 'unknown';
  }
}
