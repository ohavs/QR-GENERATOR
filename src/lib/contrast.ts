import type { Paint } from './qr/types';

/**
 * בדיקת ניגודיות לצורכי סריקה.
 *
 * סורק QR לא "רואה" צבע — הוא ממיר את הפריים לבהירות ומחפש סף בין כהה לבהיר.
 * לכן שני צבעים יכולים להיראות שונים מאוד לעין (כתום מול ורוד) ובכל זאת ליפול
 * על אותה בהירות ולהיכשל בסריקה. הנוסחה כאן היא יחס הניגודיות של WCAG, שמבוסס
 * בדיוק על אותה בהירות יחסית.
 */

function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const value = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(value)) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** בהירות יחסית לפי WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** יחס ניגודיות בין שני צבעים (1 עד 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** כל הצבעים שמרכיבים צביעה — לגרדיאנט חשוב לבדוק את כל העצירות. */
function colorsOf(paint: Paint): string[] {
  return paint.type === 'solid' ? [paint.color] : paint.stops.map((s) => s.color);
}

export type ScanRisk = 'good' | 'fair' | 'poor';

export interface ScanContrast {
  /** היחס הגרוע ביותר בין הקוד לרקע */
  ratio: number;
  risk: ScanRisk;
  message: string | null;
}

/**
 * ספי ההחלטה: מתחת ל‑3:1 קוד נכשל בסריקה בתנאים רגילים, ובין 3 ל‑4.5 הוא
 * עובד על מסך אבל מתחיל להיכשל בהדפסה, בתאורה חלשה או בגודל קטן.
 */
export function checkScanContrast(body: Paint, background: Paint | null): ScanContrast {
  // ללא רקע אי אפשר לדעת על מה הקוד יונח — מניחים לבן, המקרה הנפוץ
  const backgrounds = background ? colorsOf(background) : ['#FFFFFF'];
  const bodies = colorsOf(body);

  let worst = Number.POSITIVE_INFINITY;
  for (const fg of bodies) {
    for (const bg of backgrounds) {
      worst = Math.min(worst, contrastRatio(fg, bg));
    }
  }

  if (worst >= 4.5) return { ratio: worst, risk: 'good', message: null };
  if (worst >= 3) {
    return {
      ratio: worst,
      risk: 'fair',
      message:
        'הניגודיות בין הקוד לרקע נמוכה. על המסך זה יעבוד, אבל בהדפסה, בתאורה חלשה או בגודל קטן הסריקה עלולה להיכשל.',
    };
  }
  return {
    ratio: worst,
    risk: 'poor',
    message:
      'הניגודיות נמוכה מדי והקוד כנראה לא ייסרק. בחרו צבע קוד כהה יותר או רקע בהיר יותר.',
  };
}
