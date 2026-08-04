import type { CardTemplate } from './types';

/**
 * תבניות הכרטיסים.
 *
 * כל התבניות בגודל כרטיס ביקור תקני (85×55 מ״מ) חוץ מאלה שמסומנות אחרת,
 * כדי שאפשר יהיה להדפיס אותן בכל בית דפוס בלי התאמות.
 *
 * המיקומים בנויים סביב עיקרון אחד: הקוד תמיד יושב באזור שקט משלו, עם מרווח
 * של לפחות 4% מרוחב הכרטיס מכל טקסט. קוד שנוגע בטקסט מאבד את האזור השקט
 * שהתקן דורש ומפסיק להיסרק.
 */

const BUSINESS = { widthMm: 85, heightMm: 55 } as const;

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'clean-right',
    name: 'נקי',
    blurb: 'שם גדול משמאל, קוד מימין — הקלאסי שתמיד עובד',
    ...BUSINESS,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['name', 'title', 'phone', 'email', 'website'],
    elements: [
      { kind: 'qr', id: 'qr', x: 62, y: 22, size: 30 },
      { kind: 'text', id: 't1', field: 'name', x: 8, y: 20, width: 48, size: 7, weight: 800, color: '#0B0B0F', align: 'start', font: 'display' },
      { kind: 'text', id: 't2', field: 'title', x: 8, y: 30, width: 48, size: 4.2, weight: 500, color: '#71717A', align: 'start' },
      { kind: 'shape', id: 's1', x: 8, y: 38, width: 12, height: 0.7, color: '#5B4BFF', radius: 0.4 },
      { kind: 'text', id: 't3', field: 'phone', x: 8, y: 45, width: 48, size: 3.8, weight: 500, color: '#3F3F46', align: 'start' },
      { kind: 'text', id: 't4', field: 'email', x: 8, y: 51, width: 48, size: 3.8, weight: 500, color: '#3F3F46', align: 'start' },
      { kind: 'text', id: 't5', field: 'website', x: 8, y: 57, width: 48, size: 3.8, weight: 500, color: '#3F3F46', align: 'start' },
    ],
  },

  {
    id: 'ink-band',
    name: 'פס דיו',
    blurb: 'רצועה כהה עליונה, פרטים למטה — רשמי ומסודר',
    ...BUSINESS,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['name', 'title', 'company', 'phone', 'email'],
    elements: [
      { kind: 'shape', id: 's1', x: 0, y: 0, width: 100, height: 22, color: '#0B0B0F' },
      { kind: 'text', id: 't1', field: 'company', x: 8, y: 9, width: 84, size: 5, weight: 700, color: '#FFFFFF', align: 'start', tracking: 0.5, font: 'display' },
      { kind: 'text', id: 't2', field: 'name', x: 8, y: 32, width: 50, size: 6.4, weight: 800, color: '#0B0B0F', align: 'start', font: 'display' },
      { kind: 'text', id: 't3', field: 'title', x: 8, y: 40, width: 50, size: 3.8, weight: 500, color: '#71717A', align: 'start' },
      { kind: 'text', id: 't4', field: 'phone', x: 8, y: 51, width: 50, size: 3.8, weight: 600, color: '#0B0B0F', align: 'start' },
      { kind: 'text', id: 't5', field: 'email', x: 8, y: 57, width: 50, size: 3.8, weight: 500, color: '#3F3F46', align: 'start' },
      { kind: 'qr', id: 'qr', x: 66, y: 33, size: 26 },
    ],
  },

  {
    id: 'centered',
    name: 'ממורכז',
    blurb: 'הכול על ציר אחד — מינימלי ומאוזן',
    ...BUSINESS,
    background: '#FAFAFA',
    qrBackground: '#FAFAFA',
    usesFields: ['name', 'title', 'phone', 'website'],
    elements: [
      { kind: 'text', id: 't1', field: 'name', x: 10, y: 11, width: 80, size: 6.2, weight: 800, color: '#0B0B0F', align: 'center', font: 'display' },
      { kind: 'text', id: 't2', field: 'title', x: 10, y: 19, width: 80, size: 3.6, weight: 500, color: '#71717A', align: 'center', tracking: 1.2 },
      { kind: 'qr', id: 'qr', x: 38.5, y: 26, size: 23 },
      { kind: 'text', id: 't3', field: 'phone', x: 10, y: 56, width: 80, size: 3.8, weight: 600, color: '#0B0B0F', align: 'center' },
      { kind: 'text', id: 't4', field: 'website', x: 10, y: 62, width: 80, size: 3.6, weight: 500, color: '#71717A', align: 'center' },
    ],
  },

  {
    id: 'dark-pro',
    name: 'כהה',
    blurb: 'פחם ולבן עם קו הדגשה — נראה יקר',
    ...BUSINESS,
    background: '#0B0B0F',
    qrBackground: '#0B0B0F',
    usesFields: ['name', 'title', 'phone', 'email', 'website'],
    elements: [
      { kind: 'shape', id: 's1', x: 0, y: 0, width: 1.6, height: 65, color: '#5B4BFF' },
      { kind: 'text', id: 't1', field: 'name', x: 9, y: 17, width: 48, size: 7, weight: 800, color: '#FFFFFF', align: 'start', font: 'display' },
      { kind: 'text', id: 't2', field: 'title', x: 9, y: 26, width: 48, size: 3.8, weight: 500, color: '#A1A1AA', align: 'start', tracking: 1 },
      { kind: 'text', id: 't3', field: 'phone', x: 9, y: 44, width: 48, size: 3.8, weight: 600, color: '#FFFFFF', align: 'start' },
      { kind: 'text', id: 't4', field: 'email', x: 9, y: 50, width: 48, size: 3.6, weight: 500, color: '#A1A1AA', align: 'start' },
      { kind: 'text', id: 't5', field: 'website', x: 9, y: 56, width: 48, size: 3.6, weight: 500, color: '#A1A1AA', align: 'start' },
      { kind: 'qr', id: 'qr', x: 64, y: 21, size: 28 },
    ],
  },

  {
    id: 'scan-me',
    name: 'סרקו אותי',
    blurb: 'הקוד הוא הגיבור — לשלט, לדלפק או לחלון',
    ...BUSINESS,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['company', 'tagline', 'website'],
    elements: [
      { kind: 'text', id: 't1', field: 'company', x: 8, y: 8, width: 84, size: 5.4, weight: 800, color: '#0B0B0F', align: 'center', font: 'display' },
      { kind: 'qr', id: 'qr', x: 32, y: 17, size: 36 },
      { kind: 'shape', id: 's1', x: 22, y: 56, width: 56, height: 8, color: '#5B4BFF', radius: 4 },
      { kind: 'text', id: 't2', field: 'tagline', x: 22, y: 58.2, width: 56, size: 4, weight: 700, color: '#FFFFFF', align: 'center' },
      { kind: 'text', id: 't3', field: 'website', x: 8, y: 55, width: 84, size: 0.01, weight: 400, color: '#FFFFFF', align: 'center', opacity: 0 },
    ],
  },

  {
    id: 'trade',
    name: 'בעל מקצוע',
    blurb: 'שירות בולט וטלפון גדול — לחשמלאי, אינסטלטור, מאמן',
    ...BUSINESS,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['name', 'title', 'phone', 'tagline'],
    elements: [
      { kind: 'shape', id: 's1', x: 0, y: 0, width: 100, height: 65, color: '#F4F4F5' },
      { kind: 'shape', id: 's2', x: 0, y: 0, width: 100, height: 2.2, color: '#5B4BFF' },
      { kind: 'text', id: 't1', field: 'title', x: 8, y: 10, width: 55, size: 6.6, weight: 800, color: '#0B0B0F', align: 'start', font: 'display' },
      { kind: 'text', id: 't2', field: 'name', x: 8, y: 20, width: 55, size: 4, weight: 600, color: '#3F3F46', align: 'start' },
      { kind: 'text', id: 't3', field: 'tagline', x: 8, y: 27, width: 55, size: 3.4, weight: 500, color: '#71717A', align: 'start' },
      { kind: 'shape', id: 's3', x: 8, y: 44, width: 46, height: 11, color: '#0B0B0F', radius: 3 },
      { kind: 'text', id: 't4', field: 'phone', x: 8, y: 47.2, width: 46, size: 5.4, weight: 800, color: '#FFFFFF', align: 'center' },
      { kind: 'qr', id: 'qr', x: 62, y: 24, size: 30 },
    ],
  },

  {
    id: 'table-tent',
    name: 'שולחני',
    blurb: 'ריבועי לעמדה או לשולחן — הקוד גדול וקריא ממרחק',
    widthMm: 90,
    heightMm: 90,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['company', 'tagline'],
    elements: [
      { kind: 'text', id: 't1', field: 'company', x: 8, y: 9, width: 84, size: 6, weight: 800, color: '#0B0B0F', align: 'center', font: 'display' },
      { kind: 'text', id: 't2', field: 'tagline', x: 8, y: 18, width: 84, size: 3.6, weight: 500, color: '#71717A', align: 'center' },
      { kind: 'qr', id: 'qr', x: 25, y: 28, size: 50 },
    ],
  },

  {
    id: 'label',
    name: 'מדבקה',
    blurb: 'ריבוע קטן למוצר או לאריזה',
    widthMm: 50,
    heightMm: 50,
    background: '#FFFFFF',
    qrBackground: '#FFFFFF',
    usesFields: ['company', 'tagline'],
    elements: [
      { kind: 'qr', id: 'qr', x: 18, y: 10, size: 64 },
      { kind: 'text', id: 't1', field: 'company', x: 6, y: 80, width: 88, size: 7, weight: 700, color: '#0B0B0F', align: 'center', font: 'display' },
      { kind: 'text', id: 't2', field: 'tagline', x: 6, y: 89, width: 88, size: 4.6, weight: 500, color: '#71717A', align: 'center' },
    ],
  },
];

export const TEMPLATE_BY_ID = new Map(CARD_TEMPLATES.map((t) => [t.id, t]));
export const DEFAULT_TEMPLATE = CARD_TEMPLATES[0];
