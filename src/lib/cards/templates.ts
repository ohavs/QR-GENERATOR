import type { Paint } from '../qr/types';
import type { CardElement, CardTemplate, FieldKey } from './types';

/**
 * תבניות הכרטיסים.
 *
 * שלוש משפחות, לפי מה שהמשתמש מנסה לעשות:
 *
 * - **scan** — הקוד הוא הגיבור. שלט לדלפק, כרטיס שולחן במסעדה, מודעה בחלון.
 *   כאן הכרטיס קיים כדי לגרום למישהו לסרוק, והטקסט משרת את הקוד.
 * - **business** — כרטיס ביקור. הפרטים הם הגיבור, והקוד הוא דרך מהירה
 *   לשמור אותם או להגיע לאתר.
 * - **label** — מדבקה. שטח קטן, טקסט מזערי, קוד גדול ככל האפשר.
 *
 * המיקומים בנויים סביב עיקרון אחד: הקוד תמיד יושב באזור שקט משלו, עם מרווח
 * של לפחות 4% מרוחב הכרטיס מכל טקסט. קוד שנוגע בטקסט מאבד את האזור השקט
 * שהתקן דורש ומפסיק להיסרק. על רקע כהה או צבעוני הקוד מקבל `plate` לבן —
 * שם זה לא קישוט אלא תנאי לסריקה.
 *
 * ציר ה-Y נמדד גם הוא באחוזים **מרוחב** הכרטיס, ולכן הקצה התחתון נמצא ב-
 * `heightMm / widthMm * 100` ולא ב-100.
 */

const INK = '#0B0B0F';
const WHITE = '#FFFFFF';

const solid = (color: string): Paint => ({ type: 'solid', color });

const linear = (angle: number, from: string, to: string): Paint =>
  ({
    type: 'linear',
    angle,
    stops: [
      { offset: 0, color: from },
      { offset: 1, color: to },
    ],
  });

/** "סרקו אותי" כגלולה — חוזר בכמה תבניות, ותמיד באותה אנטומיה. */
function scanPill(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Paint,
  color: string,
  label = 'סרקו אותי',
): CardElement[] {
  return [
    { kind: 'shape', id: `${id}-bg`, x, y, width, height, fill, radius: height / 2 },
    {
      kind: 'text',
      id,
      field: null,
      text: label,
      x,
      y: y + height * 0.27,
      width,
      size: height * 0.46,
      weight: 800,
      color,
      align: 'center',
      font: 'display',
      maxLines: 1,
    },
  ];
}

export const CARD_TEMPLATES: CardTemplate[] = [
  /* ─────────────────────────── סרקו אותי ─────────────────────────── */

  {
    id: 'spotlight',
    name: 'זרקור',
    blurb: 'רקע עמוק והקוד על משטח לבן — נראה יקר מכל כיוון',
    group: 'scan',
    widthMm: 90,
    heightMm: 120,
    background: linear(120, '#1B1246', '#4C1D95'),
    usesFields: ['headline', 'tagline', 'company'],
    sample: {
      headline: 'סרקו לתפריט',
      tagline: 'כל המנות, המחירים והתמונות',
      company: 'קפה נחמה',
    },
    elements: [
      { kind: 'shape', id: 'glow', x: 48, y: -22, width: 84, height: 84, fill: solid('#7C3AED'), shape: 'ellipse', opacity: 0.5 },
      { kind: 'shape', id: 'glow2', x: -26, y: 96, width: 70, height: 70, fill: solid('#2563EB'), shape: 'ellipse', opacity: 0.35 },

      { kind: 'text', id: 'headline', field: 'headline', x: 10, y: 13, width: 80, size: 9, weight: 800, color: WHITE, align: 'center', font: 'display', maxLines: 2, lineHeight: 1.12 },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 14, y: 35, width: 72, size: 4.1, weight: 500, color: '#C7C1F5', align: 'center', maxLines: 2 },

      { kind: 'qr', id: 'qr', x: 27, y: 52.5, size: 46, plate: { padding: 5.5, radius: 7, fill: WHITE } },

      ...scanPill('pill', 27, 108, 46, 9, solid(WHITE), '#1B1246'),
      { kind: 'text', id: 'company', field: 'company', x: 10, y: 121, width: 80, size: 4.4, weight: 700, color: '#B9B2EE', align: 'center', maxLines: 1, tracking: 0.12 },
    ],
  },

  {
    id: 'menu-tent',
    name: 'תפריט',
    blurb: 'קרם וטרקוטה — לשולחן במסעדה או בבית קפה',
    group: 'scan',
    widthMm: 100,
    heightMm: 140,
    background: solid('#FBF6EF'),
    usesFields: ['company', 'headline', 'tagline', 'note'],
    sample: {
      company: 'טרטוריה',
      headline: 'התפריט שלנו',
      tagline: 'מתעדכן כל בוקר',
      note: 'פתוח א׳–ה׳ 12:00–23:00',
    },
    elements: [
      { kind: 'shape', id: 'band', x: 0, y: 0, width: 100, height: 3, fill: solid('#B4472B') },

      { kind: 'text', id: 'company', field: 'company', x: 10, y: 11, width: 80, size: 4.4, weight: 700, color: '#B4472B', align: 'center', tracking: 0.5, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 20, width: 84, size: 10.5, weight: 800, color: '#2A1B12', align: 'center', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'shape', id: 'rule', x: 44, y: 46.5, width: 12, height: 0.6, fill: solid('#B4472B'), radius: 0.3 },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 14, y: 50, width: 72, size: 4, weight: 500, color: '#7A6A5C', align: 'center', maxLines: 2 },

      { kind: 'shape', id: 'frame', x: 20, y: 63, width: 60, height: 60, fill: solid('#FFFFFF'), radius: 6 },
      { kind: 'qr', id: 'qr', x: 25, y: 68, size: 50 },

      ...scanPill('pill', 30, 126, 40, 8, solid('#B4472B'), WHITE),
      { kind: 'text', id: 'note', field: 'note', x: 10, y: 135, width: 80, size: 3.4, weight: 500, color: '#9A8A7C', align: 'center', maxLines: 1 },
    ],
  },

  {
    id: 'neon',
    name: 'ניאון',
    blurb: 'ריבוע כהה עם זוהר — לעמדה, לבר או לחלון ראווה',
    group: 'scan',
    widthMm: 90,
    heightMm: 90,
    background: solid('#08080D'),
    usesFields: ['headline', 'company'],
    sample: { headline: 'עקבו אחרינו', company: '@studio.dana' },
    elements: [
      { kind: 'shape', id: 'glow', x: 10, y: 12, width: 80, height: 80, fill: linear(135, '#22D3EE', '#A855F7'), shape: 'ellipse', opacity: 0.28 },

      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 10, width: 84, size: 7.4, weight: 800, color: WHITE, align: 'center', font: 'display', maxLines: 1 },

      { kind: 'shape', id: 'ring', x: 20, y: 23, width: 60, height: 60, fill: linear(135, '#22D3EE', '#A855F7'), radius: 8 },
      { kind: 'qr', id: 'qr', x: 23.5, y: 26.5, size: 53, plate: { padding: 0, radius: 5, fill: WHITE } },

      { kind: 'text', id: 'company', field: 'company', x: 8, y: 88, width: 84, size: 4.6, weight: 600, color: '#8B8B9E', align: 'center', maxLines: 1, tracking: 0.1 },
    ],
  },

  {
    id: 'window',
    name: 'חלון ראווה',
    blurb: 'A5 עם כותרת ענקית — נקרא ממרחק של כמה מטרים',
    group: 'scan',
    widthMm: 148,
    heightMm: 210,
    background: solid(WHITE),
    usesFields: ['headline', 'tagline', 'company', 'website'],
    sample: {
      headline: 'הזמינו כאן',
      tagline: 'משלוחים עד הבית תוך שעה',
      company: 'מכולת השכונה',
      website: 'shop.example.co.il',
    },
    elements: [
      // גובה הכרטיס הוא 141.9 יחידות (210/148). כל אלמנט ממוקם ביחס לזה,
      // ולא ל-100 — הבלבול הזה הוא שגרם לקוד לרבוץ על שורת המשנה.
      { kind: 'shape', id: 'top', x: 0, y: 0, width: 100, height: 44, fill: linear(160, '#111827', '#312E81') },

      { kind: 'text', id: 'company', field: 'company', x: 8, y: 8, width: 84, size: 3.6, weight: 700, color: '#A5B4FC', align: 'center', tracking: 0.6, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 6, y: 15, width: 88, size: 11, weight: 900, color: WHITE, align: 'center', font: 'display', maxLines: 2, lineHeight: 1.08 },

      { kind: 'shape', id: 'plate', x: 17, y: 50, width: 66, height: 64, fill: solid(WHITE), radius: 6 },
      { kind: 'qr', id: 'qr', x: 22, y: 54, size: 56 },

      { kind: 'text', id: 'tagline', field: 'tagline', x: 10, y: 117, width: 80, size: 4.4, weight: 600, color: '#374151', align: 'center', maxLines: 1 },

      ...scanPill('pill', 28, 125, 44, 8.5, solid('#312E81'), WHITE),
      { kind: 'text', id: 'website', field: 'website', x: 10, y: 136, width: 80, size: 3.2, weight: 500, color: '#9CA3AF', align: 'center', maxLines: 1 },
    ],
  },

  /* ─────────────────────────── כרטיס ביקור ─────────────────────────── */

  {
    id: 'exec',
    name: 'פחם',
    blurb: 'כרטיס ביקור כהה עם קו זהב — שקט ויקר',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid('#101014'),
    usesFields: ['name', 'title', 'phone', 'email', 'website'],
    sample: {
      name: 'דנה כהן',
      title: 'מעצבת גרפית',
      phone: '050-1234567',
      email: 'dana@example.com',
      website: 'dana.co.il',
    },
    elements: [
      { kind: 'shape', id: 'edge', x: 0, y: 0, width: 1.4, height: 64.7, fill: linear(90, '#D4AF6A', '#8A6A2F') },

      { kind: 'text', id: 'name', field: 'name', x: 8, y: 13, width: 46, size: 7.2, weight: 800, color: WHITE, align: 'start', font: 'display', maxLines: 1 },
      { kind: 'text', id: 'title', field: 'title', x: 8, y: 22.5, width: 46, size: 3.5, weight: 500, color: '#D4AF6A', align: 'start', tracking: 0.28, maxLines: 1 },

      { kind: 'shape', id: 'rule', x: 8, y: 31, width: 10, height: 0.5, fill: solid('#3A3A45'), radius: 0.25 },

      { kind: 'text', id: 'phone', field: 'phone', x: 8, y: 38, width: 46, size: 3.7, weight: 600, color: '#E5E5EA', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'email', field: 'email', x: 8, y: 45, width: 46, size: 3.5, weight: 500, color: '#9A9AA5', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'website', field: 'website', x: 8, y: 52, width: 46, size: 3.5, weight: 500, color: '#9A9AA5', align: 'start', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 63, y: 19, size: 26, plate: { padding: 3, radius: 3.5, fill: WHITE } },
    ],
  },

  {
    id: 'editorial',
    name: 'נקי',
    blurb: 'לבן, שם גדול וקו הדגשה — הקלאסי שתמיד עובד',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid(WHITE),
    usesFields: ['name', 'title', 'company', 'phone', 'email'],
    sample: {
      name: 'דנה כהן',
      title: 'מעצבת גרפית',
      company: 'סטודיו דנה',
      phone: '050-1234567',
      email: 'dana@example.com',
    },
    elements: [
      { kind: 'text', id: 'company', field: 'company', x: 8, y: 10, width: 46, size: 3.3, weight: 700, color: '#5B4BFF', align: 'start', tracking: 0.4, maxLines: 1 },
      { kind: 'text', id: 'name', field: 'name', x: 8, y: 18, width: 46, size: 7, weight: 800, color: INK, align: 'start', font: 'display', maxLines: 1 },
      { kind: 'text', id: 'title', field: 'title', x: 8, y: 27.5, width: 46, size: 3.6, weight: 500, color: '#71717A', align: 'start', maxLines: 1 },

      { kind: 'shape', id: 'rule', x: 8, y: 36, width: 11, height: 0.7, fill: solid('#5B4BFF'), radius: 0.35 },

      { kind: 'text', id: 'phone', field: 'phone', x: 8, y: 44, width: 46, size: 3.7, weight: 600, color: '#27272A', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'email', field: 'email', x: 8, y: 51, width: 46, size: 3.5, weight: 500, color: '#52525B', align: 'start', maxLines: 1 },

      { kind: 'shape', id: 'panel', x: 60, y: 15, width: 32, height: 34.7, fill: solid('#F4F4F5'), radius: 3 },
      { kind: 'qr', id: 'qr', x: 63.5, y: 18.5, size: 25 },
    ],
  },

  {
    id: 'split',
    name: 'חצוי',
    blurb: 'חצי צבע וחצי לבן — הקוד בולט על הצבע',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid(WHITE),
    usesFields: ['name', 'title', 'phone', 'website'],
    sample: {
      name: 'דנה כהן',
      title: 'מעצבת גרפית',
      phone: '050-1234567',
      website: 'dana.co.il',
    },
    elements: [
      { kind: 'shape', id: 'block', x: 56, y: 0, width: 44, height: 64.7, fill: linear(135, '#5B4BFF', '#312E81') },

      { kind: 'text', id: 'name', field: 'name', x: 8, y: 15, width: 42, size: 6.6, weight: 800, color: INK, align: 'start', font: 'display', maxLines: 2, lineHeight: 1.12 },
      { kind: 'text', id: 'title', field: 'title', x: 8, y: 31, width: 42, size: 3.5, weight: 500, color: '#71717A', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'phone', field: 'phone', x: 8, y: 44, width: 42, size: 4, weight: 700, color: INK, align: 'start', maxLines: 1 },
      { kind: 'text', id: 'website', field: 'website', x: 8, y: 51, width: 42, size: 3.4, weight: 500, color: '#71717A', align: 'start', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 63, y: 17, size: 30, plate: { padding: 3.2, radius: 4, fill: WHITE } },
    ],
  },

  {
    id: 'trade',
    name: 'בעל מקצוע',
    blurb: 'המקצוע גדול והטלפון בולט — לחשמלאי, אינסטלטור, מאמן',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid('#F7F7F8'),
    usesFields: ['title', 'name', 'tagline', 'phone'],
    sample: {
      title: 'חשמלאי מוסמך',
      name: 'יוסי לוי',
      tagline: 'שירות 24/7 בכל אזור המרכז',
      phone: '050-1234567',
    },
    elements: [
      { kind: 'shape', id: 'top', x: 0, y: 0, width: 100, height: 2.4, fill: solid('#F59E0B') },

      { kind: 'text', id: 'title', field: 'title', x: 8, y: 9, width: 50, size: 6.6, weight: 800, color: INK, align: 'start', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'text', id: 'name', field: 'name', x: 8, y: 24, width: 50, size: 3.8, weight: 600, color: '#3F3F46', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 8, y: 30.5, width: 50, size: 3.2, weight: 500, color: '#71717A', align: 'start', maxLines: 2 },

      { kind: 'shape', id: 'phonebox', x: 8, y: 43, width: 46, height: 12, fill: solid(INK), radius: 3 },
      { kind: 'text', id: 'phone', field: 'phone', x: 8, y: 46.4, width: 46, size: 5.4, weight: 800, color: WHITE, align: 'center', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 62, y: 18, size: 30, plate: { padding: 3, radius: 4, fill: WHITE } },
    ],
  },

  /* ─────────────────────────── מדבקות ─────────────────────────── */

  {
    id: 'product',
    name: 'מדבקת מוצר',
    blurb: 'ריבוע קטן לאריזה — הקוד תופס כמעט הכול',
    group: 'label',
    widthMm: 50,
    heightMm: 50,
    background: solid(WHITE),
    usesFields: ['company', 'note'],
    sample: { company: 'קפה נחמה', note: 'סרקו למקור' },
    elements: [
      { kind: 'shape', id: 'ring', x: 3, y: 3, width: 94, height: 94, fill: solid('#E4E4E7'), radius: 6 },
      { kind: 'shape', id: 'inner', x: 4.5, y: 4.5, width: 91, height: 91, fill: solid(WHITE), radius: 5 },

      { kind: 'text', id: 'company', field: 'company', x: 8, y: 10, width: 84, size: 6.6, weight: 800, color: INK, align: 'center', font: 'display', maxLines: 1 },
      { kind: 'qr', id: 'qr', x: 21, y: 21, size: 58 },
      { kind: 'text', id: 'note', field: 'note', x: 8, y: 84, width: 84, size: 4.4, weight: 600, color: '#71717A', align: 'center', maxLines: 1 },
    ],
  },

  {
    id: 'wifi-card',
    name: 'רשת אורחים',
    blurb: 'כרטיס וויפיי לאירוח — סורקים ומתחברים בלי להקליד סיסמה',
    group: 'label',
    widthMm: 85,
    heightMm: 55,
    background: linear(140, '#0E7490', '#134E4A'),
    usesFields: ['headline', 'company', 'note'],
    sample: { headline: 'רשת אורחים', company: 'קפה נחמה', note: 'סרקו והתחברו — בלי סיסמה' },
    elements: [
      { kind: 'shape', id: 'glow', x: 52, y: -18, width: 60, height: 60, fill: solid('#5EEAD4'), shape: 'ellipse', opacity: 0.18 },

      { kind: 'text', id: 'company', field: 'company', x: 8, y: 12, width: 46, size: 3.4, weight: 700, color: '#5EEAD4', align: 'start', tracking: 0.4, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 19, width: 46, size: 7, weight: 800, color: WHITE, align: 'start', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'text', id: 'note', field: 'note', x: 8, y: 44, width: 46, size: 3.4, weight: 500, color: '#B6E9E2', align: 'start', maxLines: 2 },

      { kind: 'qr', id: 'qr', x: 63, y: 17, size: 30, plate: { padding: 3.2, radius: 4, fill: WHITE } },
    ],
  },
];

export const TEMPLATE_BY_ID = new Map(CARD_TEMPLATES.map((t) => [t.id, t]));
export const DEFAULT_TEMPLATE = CARD_TEMPLATES[0];

export const CARD_GROUPS: Array<{ id: CardTemplate['group']; label: string }> = [
  { id: 'scan', label: 'סרקו אותי' },
  { id: 'business', label: 'כרטיס ביקור' },
  { id: 'label', label: 'מדבקות' },
];

/** השדות שהתבנית באמת מציירת, לפי הסדר שבו הם מופיעים בכרטיס. */
export function templateFields(template: CardTemplate): FieldKey[] {
  return template.usesFields;
}
