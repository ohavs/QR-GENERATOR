import type { Paint } from '../qr/types';
import type { CardElement, CardTemplate, FieldKey } from './types';

/**
 * תבניות הכרטיסים.
 *
 * ארבע משפחות, לפי מה שהמשתמש מנסה לעשות:
 *
 * - **scan** — הקוד הוא הגיבור. שלט לדלפק, מודעה בחלון, שילוט אירוע.
 * - **menu** — תפריט מודפס שהקוד בתחתיתו מוביל לגרסה המלאה או להזמנה.
 * - **business** — כרטיס ביקור. הפרטים הם הגיבור.
 * - **label** — מדבקה. שטח קטן, טקסט מזערי, קוד גדול ככל האפשר.
 *
 * שני כללים חוצי-תבניות:
 *
 * 1. **הקוד תמיד באזור שקט משלו**, לפחות 4% מרוחב הכרטיס מכל טקסט. קוד שנוגע
 *    בטקסט מאבד את האזור השקט שהתקן דורש ומפסיק להיסרק.
 * 2. **על רקע כהה או צבעוני הקוד מקבל `plate` בהיר.** שם זה לא קישוט אלא תנאי
 *    לסריקה — הרקע חודר לאזור השקט בלעדיו.
 *
 * ציר ה-Y נמדד באחוזים **מרוחב** הכרטיס, ולכן הקצה התחתון נמצא ב-
 * `heightMm / widthMm * 100` ולא ב-100. `templates.test.ts` אוכף את זה.
 */

const INK = '#0B0B0F';
const WHITE = '#FFFFFF';

const solid = (color: string): Paint => ({ type: 'solid', color });

const linear = (angle: number, from: string, to: string): Paint => ({
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

const MENU_SAMPLE = {
  items:
    'אספרסו | 8\nקפוצ׳ינו | 12\nמאצ׳ה לאטה | 16\nקרואסון חמאה | 14\nשקשוקה | 46\nסלט הבית | 52',
};

export const CARD_TEMPLATES: CardTemplate[] = [
  /* ═══════════════════════ סרקו אותי ═══════════════════════ */

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
    id: 'aurora',
    name: 'זוהר',
    blurb: 'כתמי צבע רכים על שחור — מודרני, נראה כמו מסך',
    group: 'scan',
    widthMm: 90,
    heightMm: 120,
    background: linear(150, '#160B2E', '#06060F'),
    usesFields: ['headline', 'tagline', 'company'],
    sample: { headline: 'עקבו אחרינו', tagline: 'תכנים חדשים כל שבוע', company: '@studio.dana' },
    elements: [
      /*
        שני כתמים רוויים במקום שלושה שקופים.

        שלושה כתמים ב-0.3–0.42 שקיפות מעל שחור נבלעו זה בזה והפכו לאפור
        עכור: שקיפות נמוכה מורידה רוויה לפני שהיא מורידה בהירות. כאן הצבע
        מלא, והדהייה נעשית בגרדיאנט של הכתם עצמו.
      */
      { kind: 'shape', id: 'b1', x: -24, y: -26, width: 86, height: 86, fill: linear(140, '#F43F5E', '#7C1D6F'), shape: 'ellipse', opacity: 0.85 },
      { kind: 'shape', id: 'b2', x: 46, y: 8, width: 78, height: 78, fill: linear(140, '#6366F1', '#0EA5E9'), shape: 'ellipse', opacity: 0.7 },

      { kind: 'text', id: 'headline', field: 'headline', x: 9, y: 14, width: 82, size: 9.4, weight: 900, color: WHITE, align: 'center', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 14, y: 36.5, width: 72, size: 4, weight: 500, color: '#D5D2E6', align: 'center', maxLines: 2 },

      { kind: 'qr', id: 'qr', x: 28, y: 54, size: 44, plate: { padding: 5, radius: 10, fill: WHITE } },

      { kind: 'text', id: 'company', field: 'company', x: 10, y: 112, width: 80, size: 5, weight: 700, color: WHITE, align: 'center', maxLines: 1 },
      { kind: 'text', id: 'scan', field: null, text: 'סרקו את הקוד', x: 10, y: 120, width: 80, size: 3.4, weight: 500, color: '#8E8AA3', align: 'center', maxLines: 1, tracking: 0.2 },
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
    id: 'mono',
    name: 'מונו',
    blurb: 'שחור-לבן, טיפוגרפיה ענקית — נקי ולא מתיישן',
    group: 'scan',
    widthMm: 90,
    heightMm: 120,
    background: solid(WHITE),
    usesFields: ['headline', 'tagline', 'company'],
    sample: { headline: 'סרקו', tagline: 'התפריט המלא, מתעדכן בזמן אמת', company: 'קפה נחמה' },
    elements: [
      { kind: 'shape', id: 'bar', x: 0, y: 0, width: 100, height: 6, fill: solid(INK) },

      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 15, width: 84, size: 17, weight: 900, color: INK, align: 'start', font: 'display', maxLines: 1 },
      { kind: 'shape', id: 'rule', x: 8, y: 39, width: 84, height: 0.6, fill: solid(INK) },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 8, y: 43, width: 84, size: 4.2, weight: 500, color: '#52525B', align: 'start', maxLines: 2 },

      { kind: 'qr', id: 'qr', x: 25, y: 60, size: 50 },

      { kind: 'shape', id: 'foot', x: 0, y: 120, width: 100, height: 13.3, fill: solid(INK) },
      { kind: 'text', id: 'company', field: 'company', x: 8, y: 124, width: 84, size: 5, weight: 700, color: WHITE, align: 'center', maxLines: 1, tracking: 0.3 },
    ],
  },

  {
    id: 'ticket',
    name: 'כרטיס כניסה',
    blurb: 'קו ניתוק ומספור — לאירועים, הגרלות וכניסות',
    group: 'scan',
    widthMm: 100,
    heightMm: 55,
    background: solid('#FFF9F0'),
    usesFields: ['headline', 'name', 'note', 'company'],
    sample: {
      headline: 'ערב פתיחה',
      name: 'כניסה כפולה',
      note: 'יום חמישי · 20:30',
      company: 'גלריה 12',
    },
    elements: [
      { kind: 'shape', id: 'stub', x: 62, y: 0, width: 38, height: 55, fill: solid('#F4E7D3') },
      { kind: 'shape', id: 'perf', x: 61.6, y: 3, width: 0.5, height: 49, fill: solid('#C9AE86') },

      { kind: 'text', id: 'company', field: 'company', x: 6, y: 7, width: 50, size: 3, weight: 700, color: '#B4762B', align: 'start', tracking: 0.45, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 6, y: 13, width: 52, size: 7.6, weight: 800, color: '#3A2A16', align: 'start', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'text', id: 'name', field: 'name', x: 6, y: 33, width: 52, size: 3.8, weight: 600, color: '#6B5636', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'note', field: 'note', x: 6, y: 39.5, width: 52, size: 3.4, weight: 500, color: '#8A7355', align: 'start', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 68, y: 11, size: 26, plate: { padding: 2.5, radius: 3, fill: WHITE } },
      { kind: 'text', id: 'scan', field: null, text: 'סרקו בכניסה', x: 63, y: 44, width: 36, size: 3, weight: 700, color: '#8A6A3A', align: 'center', maxLines: 1 },
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

  /* ═══════════════════════ תפריטים ═══════════════════════ */

  {
    id: 'menu-noir',
    name: 'נואר',
    blurb: 'פחם וזהב עם קו נקודות — מסעדת שף',
    group: 'menu',
    widthMm: 148,
    heightMm: 210,
    background: solid('#14110E'),
    usesFields: ['company', 'headline', 'items', 'note'],
    sample: { company: 'MAISON', headline: 'התפריט', note: 'סרקו לתפריט המלא ולאלרגנים', ...MENU_SAMPLE },
    elements: [
      { kind: 'shape', id: 'rule1', x: 14, y: 11, width: 72, height: 0.25, fill: solid('#C9A227') },
      { kind: 'text', id: 'company', field: 'company', x: 10, y: 15, width: 80, size: 3.4, weight: 700, color: '#C9A227', align: 'center', tracking: 0.8, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 23, width: 84, size: 9.5, weight: 800, color: '#F5EEDF', align: 'center', font: 'display', maxLines: 1 },
      { kind: 'shape', id: 'rule2', x: 45, y: 37, width: 10, height: 0.25, fill: solid('#C9A227') },

      { kind: 'items', id: 'items', field: 'items', x: 14, y: 46, width: 72, rowHeight: 8.4, size: 3.9, weight: 500, color: '#EDE4D3', priceColor: '#C9A227', leader: true, maxRows: 8 },

      { kind: 'shape', id: 'rule3', x: 14, y: 111, width: 72, height: 0.25, fill: solid('#3A322A') },
      { kind: 'qr', id: 'qr', x: 41, y: 116, size: 18, plate: { padding: 2.5, radius: 3, fill: WHITE } },
      { kind: 'text', id: 'note', field: 'note', x: 10, y: 137, width: 80, size: 3, weight: 500, color: '#8C8171', align: 'center', maxLines: 1 },
    ],
  },

  {
    id: 'menu-cream',
    name: 'טרקוטה',
    blurb: 'קרם וחימר — בית קפה, מאפייה, בראנץ׳',
    group: 'menu',
    widthMm: 148,
    heightMm: 210,
    background: solid('#FBF5EC'),
    usesFields: ['company', 'headline', 'items', 'note'],
    sample: { company: 'קפה נחמה', headline: 'הבוקר שלנו', note: 'סרקו לתפריט המלא', ...MENU_SAMPLE },
    elements: [
      { kind: 'shape', id: 'band', x: 0, y: 0, width: 100, height: 2.6, fill: solid('#B4472B') },
      { kind: 'shape', id: 'blob', x: 66, y: -14, width: 52, height: 52, fill: solid('#E9D3BF'), shape: 'ellipse', opacity: 0.75 },

      { kind: 'text', id: 'company', field: 'company', x: 9, y: 13, width: 60, size: 3.6, weight: 700, color: '#B4472B', align: 'start', tracking: 0.5, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 9, y: 20, width: 66, size: 10.5, weight: 800, color: '#3A2418', align: 'start', font: 'display', maxLines: 1 },
      { kind: 'shape', id: 'rule', x: 9, y: 36, width: 14, height: 0.7, fill: solid('#B4472B'), radius: 0.35 },

      { kind: 'items', id: 'items', field: 'items', x: 9, y: 46, width: 82, rowHeight: 7.6, size: 3.9, weight: 500, color: '#3A2418', priceColor: '#B4472B', leader: true, maxRows: 9 },

      { kind: 'shape', id: 'card', x: 9, y: 116, width: 82, height: 20, fill: solid('#F1E2D2'), radius: 3 },
      { kind: 'qr', id: 'qr', x: 71, y: 119, size: 14 },
      { kind: 'text', id: 'note', field: 'note', x: 14, y: 122.5, width: 52, size: 3.8, weight: 700, color: '#6B4A33', align: 'start', maxLines: 2 },
    ],
  },

  {
    id: 'menu-bistro',
    name: 'ביסטרו',
    blurb: 'ירוק עמוק וקרם — טרטוריה, ביסטרו, יין',
    group: 'menu',
    widthMm: 148,
    heightMm: 210,
    background: solid('#12241C'),
    usesFields: ['company', 'headline', 'tagline', 'items', 'note'],
    sample: {
      company: 'TRATTORIA',
      headline: 'המנות שלנו',
      tagline: 'מתחלף לפי העונה',
      note: 'סרקו להזמנה',
      ...MENU_SAMPLE,
    },
    elements: [
      { kind: 'shape', id: 'frame', x: 5, y: 5, width: 90, height: 131.9, fill: solid('#1B3227'), radius: 3 },

      { kind: 'text', id: 'company', field: 'company', x: 10, y: 14, width: 80, size: 3.2, weight: 700, color: '#9FD3B4', align: 'center', tracking: 0.8, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 10, y: 21, width: 80, size: 9, weight: 800, color: '#F4F1E6', align: 'center', font: 'display', maxLines: 1 },
      { kind: 'text', id: 'tagline', field: 'tagline', x: 14, y: 33, width: 72, size: 3.4, weight: 500, color: '#7FA890', align: 'center', maxLines: 1 },

      { kind: 'items', id: 'items', field: 'items', x: 13, y: 44, width: 74, rowHeight: 7.4, size: 3.7, weight: 500, color: '#F4F1E6', priceColor: '#9FD3B4', leader: true, maxRows: 9 },

      { kind: 'qr', id: 'qr', x: 12, y: 112, size: 20, plate: { padding: 2.5, radius: 3, fill: WHITE } },
      { kind: 'text', id: 'note', field: 'note', x: 40, y: 118, width: 48, size: 4.2, weight: 700, color: '#F4F1E6', align: 'start', maxLines: 2 },
    ],
  },

  {
    id: 'menu-bar',
    name: 'בר',
    blurb: 'לילה, ענבר וציאן — קוקטיילים ומשקאות',
    group: 'menu',
    widthMm: 148,
    heightMm: 210,
    background: solid('#0A0A12'),
    usesFields: ['company', 'headline', 'items', 'note'],
    sample: { company: 'NIGHT BAR', headline: 'קוקטיילים', note: 'סרקו לתפריט המלא', ...MENU_SAMPLE },
    elements: [
      { kind: 'shape', id: 'glow1', x: -14, y: -14, width: 62, height: 62, fill: solid('#F59E0B'), shape: 'ellipse', opacity: 0.28 },
      { kind: 'shape', id: 'glow2', x: 58, y: 96, width: 62, height: 62, fill: solid('#22D3EE'), shape: 'ellipse', opacity: 0.24 },

      { kind: 'text', id: 'company', field: 'company', x: 10, y: 14, width: 80, size: 3.2, weight: 700, color: '#F59E0B', align: 'center', tracking: 0.9, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 21, width: 84, size: 10, weight: 900, color: WHITE, align: 'center', font: 'display', maxLines: 1 },
      { kind: 'shape', id: 'rule', x: 42, y: 36, width: 16, height: 0.4, fill: solid('#F59E0B'), radius: 0.2 },

      { kind: 'items', id: 'items', field: 'items', x: 13, y: 45, width: 74, rowHeight: 7.6, size: 3.8, weight: 500, color: '#E7E7F0', priceColor: '#F59E0B', leader: true, maxRows: 7 },

      { kind: 'qr', id: 'qr', x: 40, y: 106, size: 20, plate: { padding: 3, radius: 4, fill: WHITE } },
      { kind: 'text', id: 'note', field: 'note', x: 10, y: 134, width: 80, size: 3.2, weight: 600, color: '#8A8AA0', align: 'center', maxLines: 1, tracking: 0.2 },
    ],
  },

  {
    id: 'menu-table',
    name: 'תפריט שולחן',
    blurb: 'A6 קומפקטי לשולחן — מחזיק מעמד ליד צלחות',
    group: 'menu',
    widthMm: 105,
    heightMm: 148,
    background: solid('#FFFDF8'),
    usesFields: ['headline', 'items', 'note'],
    sample: { headline: 'מיוחדים היום', note: 'סרקו לתפריט המלא', ...MENU_SAMPLE },
    elements: [
      { kind: 'shape', id: 'top', x: 0, y: 0, width: 100, height: 22, fill: solid('#1F3A5F') },
      { kind: 'text', id: 'headline', field: 'headline', x: 8, y: 7.5, width: 84, size: 7, weight: 800, color: WHITE, align: 'center', font: 'display', maxLines: 1 },

      { kind: 'items', id: 'items', field: 'items', x: 10, y: 32, width: 80, rowHeight: 8, size: 4.2, weight: 500, color: '#1F2937', priceColor: '#1F3A5F', leader: true, maxRows: 8 },

      { kind: 'shape', id: 'foot', x: 0, y: 104, width: 100, height: 36.9, fill: solid('#F0F4F8') },
      { kind: 'qr', id: 'qr', x: 8, y: 110, size: 24 },
      { kind: 'text', id: 'note', field: 'note', x: 38, y: 118, width: 54, size: 4, weight: 700, color: '#1F3A5F', align: 'start', maxLines: 2 },
    ],
  },

  /* ═══════════════════════ כרטיסי ביקור ═══════════════════════ */

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
    sample: { name: 'דנה כהן', title: 'מעצבת גרפית', phone: '050-1234567', website: 'dana.co.il' },
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
    id: 'duotone',
    name: 'דו-גוני',
    blurb: 'אלכסון צבעוני על לבן — נועז בלי להיות רועש',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid('#FAFAFA'),
    usesFields: ['name', 'title', 'phone', 'email'],
    sample: { name: 'דנה כהן', title: 'מעצבת גרפית', phone: '050-1234567', email: 'dana@example.com' },
    elements: [
      { kind: 'shape', id: 'blob', x: 52, y: -22, width: 70, height: 70, fill: linear(140, '#F97316', '#DB2777'), shape: 'ellipse' },
      { kind: 'shape', id: 'blob2', x: 60, y: 34, width: 56, height: 56, fill: linear(140, '#DB2777', '#7C3AED'), shape: 'ellipse', opacity: 0.55 },

      { kind: 'text', id: 'name', field: 'name', x: 8, y: 14, width: 42, size: 7, weight: 800, color: INK, align: 'start', font: 'display', maxLines: 2, lineHeight: 1.1 },
      { kind: 'text', id: 'title', field: 'title', x: 8, y: 31, width: 42, size: 3.5, weight: 500, color: '#71717A', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'phone', field: 'phone', x: 8, y: 43, width: 42, size: 4, weight: 700, color: INK, align: 'start', maxLines: 1 },
      { kind: 'text', id: 'email', field: 'email', x: 8, y: 50, width: 42, size: 3.3, weight: 500, color: '#71717A', align: 'start', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 64, y: 18, size: 28, plate: { padding: 3, radius: 4, fill: WHITE } },
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

  {
    id: 'lux',
    name: 'לוקס',
    blurb: 'שמנת ושחור, הכול ממורכז — מינימלי ויקר',
    group: 'business',
    widthMm: 85,
    heightMm: 55,
    background: solid('#F4F1EA'),
    usesFields: ['name', 'title', 'phone', 'website'],
    sample: { name: 'דנה כהן', title: 'ARCHITECT', phone: '050-1234567', website: 'dana.co.il' },
    elements: [
      { kind: 'shape', id: 'ruleTop', x: 8, y: 8, width: 84, height: 0.35, fill: solid('#1C1917') },
      { kind: 'shape', id: 'ruleBot', x: 8, y: 56.4, width: 84, height: 0.35, fill: solid('#1C1917') },

      { kind: 'text', id: 'name', field: 'name', x: 6, y: 15, width: 52, size: 7.4, weight: 700, color: '#1C1917', align: 'center', font: 'display', maxLines: 1 },
      { kind: 'text', id: 'title', field: 'title', x: 6, y: 26, width: 52, size: 3, weight: 500, color: '#78716C', align: 'center', tracking: 0.7, maxLines: 1 },
      { kind: 'text', id: 'phone', field: 'phone', x: 6, y: 40, width: 52, size: 3.6, weight: 600, color: '#1C1917', align: 'center', maxLines: 1 },
      { kind: 'text', id: 'website', field: 'website', x: 6, y: 46.5, width: 52, size: 3.2, weight: 500, color: '#78716C', align: 'center', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 64, y: 20, size: 24 },
    ],
  },

  /* ═══════════════════════ מדבקות ותוויות ═══════════════════════ */

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
    id: 'badge',
    name: 'תג עגול',
    blurb: 'עיגול צבעוני — מדבקת אריזה, סטיקר, כוס',
    group: 'label',
    widthMm: 50,
    heightMm: 50,
    background: solid(WHITE),
    usesFields: ['company', 'note'],
    sample: { company: 'קפה נחמה', note: 'סרקו אותי' },
    elements: [
      { kind: 'shape', id: 'disc', x: 0, y: 0, width: 100, height: 100, fill: linear(135, '#7C3AED', '#2563EB'), shape: 'ellipse' },
      { kind: 'shape', id: 'inner', x: 6, y: 6, width: 88, height: 88, fill: solid('#FFFFFF'), shape: 'ellipse', opacity: 0.14 },

      { kind: 'text', id: 'company', field: 'company', x: 10, y: 12, width: 80, size: 5.6, weight: 800, color: WHITE, align: 'center', font: 'display', maxLines: 1 },
      { kind: 'qr', id: 'qr', x: 27, y: 26, size: 46, plate: { padding: 4, radius: 6, fill: WHITE } },
      { kind: 'text', id: 'note', field: 'note', x: 10, y: 82, width: 80, size: 4.4, weight: 700, color: WHITE, align: 'center', maxLines: 1 },
    ],
  },

  {
    id: 'shipping',
    name: 'תווית משלוח',
    blurb: 'מלבן תפעולי — מעקב חבילה, מלאי, ארגז',
    group: 'label',
    widthMm: 100,
    heightMm: 50,
    background: solid(WHITE),
    usesFields: ['company', 'headline', 'name', 'note'],
    sample: {
      company: 'מחסן מרכזי',
      headline: 'משלוח #4821',
      name: 'דנה כהן',
      note: 'סרקו למעקב',
    },
    elements: [
      { kind: 'shape', id: 'frame', x: 1.5, y: 1.5, width: 97, height: 47, fill: solid('#111827') },
      { kind: 'shape', id: 'inner', x: 2.6, y: 2.6, width: 94.8, height: 44.8, fill: solid(WHITE) },

      { kind: 'text', id: 'company', field: 'company', x: 7, y: 8, width: 52, size: 3, weight: 700, color: '#6B7280', align: 'start', tracking: 0.4, maxLines: 1 },
      { kind: 'text', id: 'headline', field: 'headline', x: 7, y: 14, width: 52, size: 7, weight: 800, color: '#111827', align: 'start', font: 'display', maxLines: 1 },
      { kind: 'shape', id: 'rule', x: 7, y: 26, width: 52, height: 0.4, fill: solid('#D1D5DB') },
      { kind: 'text', id: 'name', field: 'name', x: 7, y: 30, width: 52, size: 4, weight: 600, color: '#374151', align: 'start', maxLines: 1 },
      { kind: 'text', id: 'note', field: 'note', x: 7, y: 38, width: 52, size: 3.2, weight: 500, color: '#6B7280', align: 'start', maxLines: 1 },

      { kind: 'qr', id: 'qr', x: 66, y: 9, size: 28 },
    ],
  },

  {
    id: 'wifi-card',
    name: 'רשת אורחים',
    blurb: 'כרטיס וויפיי לאירוח — סורקים ומתחברים בלי סיסמה',
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
  { id: 'menu', label: 'תפריטים' },
  { id: 'business', label: 'כרטיס ביקור' },
  { id: 'label', label: 'מדבקות' },
];

/** השדות שהתבנית באמת מציירת, לפי הסדר שבו הם מופיעים בכרטיס. */
export function templateFields(template: CardTemplate): FieldKey[] {
  return template.usesFields;
}
