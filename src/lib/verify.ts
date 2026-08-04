import { renderToCanvas } from './qr/render/canvas';
import type { QrGeometry } from './qr/types';

/**
 * בדיקת סריקוּת אמיתית: מרנדרים את הקוד בגודל שמדמה פריים של מצלמת טלפון
 * ומנסים לפענח אותו בחזרה.
 *
 * הבדיקה נעשית ברזולוציה נמוכה (480px) בכוונה — קוד שנסרק רק בתמונת ענק
 * ייכשל בדיוק בתנאים שבהם משתמשים סורקים באמת: מסך קטן, הדפסה, תאורה בינונית.
 */

export type ScanCheck = 'ok' | 'risky' | 'unknown';

const FRAME_WIDTH = 480;

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
      width: FRAME_WIDTH,
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
