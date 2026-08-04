export type SizeGroup = 'digital' | 'print' | 'social';

export interface SizePreset {
  id: string;
  label: string;
  hint: string;
  group: SizeGroup;
  width: number;
  /** ברירת מחדל: ריבועי (או יחס הלוח, אם יש כיתוב) */
  height?: number;
  /** מידות פיזיות במ"מ — מאפשרות ייצוא PDF מדויק להדפסה */
  mm?: [number, number];
}

const DPI = 300;
const mmToPx = (mm: number): number => Math.round((mm / 25.4) * DPI);

export const SIZE_GROUPS: Record<SizeGroup, string> = {
  digital: 'דיגיטל',
  print: 'הדפסה',
  social: 'רשתות ומדיה',
};

export const SIZES: SizePreset[] = [
  // ── דיגיטל ──────────────────────────────────────────────
  { id: 'px256', label: '256 פיקסל', hint: 'אייקון קטן, חתימת מייל', group: 'digital', width: 256 },
  { id: 'px512', label: '512 פיקסל', hint: 'אתר, מצגת', group: 'digital', width: 512 },
  { id: 'px1024', label: '1024 פיקסל', hint: 'ברירת מחדל מומלצת', group: 'digital', width: 1024 },
  { id: 'px2048', label: '2048 פיקסל', hint: 'איכות גבוהה', group: 'digital', width: 2048 },
  { id: 'px4096', label: '4096 פיקסל', hint: 'שילוט ומסכים גדולים', group: 'digital', width: 4096 },

  // ── הדפסה (300 DPI) ─────────────────────────────────────
  {
    id: 'cm2',
    label: '2×2 ס״מ',
    hint: 'מדבקה זעירה — דורש טקסט קצר',
    group: 'print',
    width: mmToPx(20),
    mm: [20, 20],
  },
  { id: 'cm3', label: '3×3 ס״מ', hint: 'מדבקת מוצר', group: 'print', width: mmToPx(30), mm: [30, 30] },
  { id: 'cm5', label: '5×5 ס״מ', hint: 'תפריט, פלייר', group: 'print', width: mmToPx(50), mm: [50, 50] },
  { id: 'cm8', label: '8×8 ס״מ', hint: 'שולחן, עמדה', group: 'print', width: mmToPx(80), mm: [80, 80] },
  { id: 'cm10', label: '10×10 ס״מ', hint: 'שלט קטן', group: 'print', width: mmToPx(100), mm: [100, 100] },
  { id: 'cm15', label: '15×15 ס״מ', hint: 'שלט חלון', group: 'print', width: mmToPx(150), mm: [150, 150] },

  // ── רשתות ומדיה ─────────────────────────────────────────
  {
    id: 'ig-post',
    label: 'פוסט אינסטגרם',
    hint: '1080 × 1080',
    group: 'social',
    width: 1080,
    height: 1080,
  },
  {
    id: 'ig-story',
    label: 'סטורי / ריל',
    hint: '1080 × 1920',
    group: 'social',
    width: 1080,
    height: 1920,
  },
  {
    id: 'wa-status',
    label: 'סטטוס וואטסאפ',
    hint: '1080 × 1920',
    group: 'social',
    width: 1080,
    height: 1920,
  },
  {
    id: 'card',
    label: 'כרטיס ביקור',
    hint: '85 × 55 מ״מ',
    group: 'social',
    width: mmToPx(85),
    height: mmToPx(55),
    mm: [85, 55],
  },
  {
    id: 'a5',
    label: 'פלייר A5',
    hint: '148 × 210 מ״מ',
    group: 'social',
    width: mmToPx(148),
    height: mmToPx(210),
    mm: [148, 210],
  },
  {
    id: 'a4',
    label: 'כרזת A4',
    hint: '210 × 297 מ״מ',
    group: 'social',
    width: mmToPx(210),
    height: mmToPx(297),
    mm: [210, 297],
  },
];

export const SIZE_BY_ID = new Map(SIZES.map((s) => [s.id, s]));
export const DEFAULT_SIZE = SIZE_BY_ID.get('px1024')!;

/** גודל בפועל בבתים משוער, להצגה למשתמש. */
export function describeSize(size: SizePreset, boardRatio: number): string {
  const h = size.height ?? Math.round(size.width * boardRatio);
  return `${size.width} × ${h}`;
}
