/**
 * פריסת גיליון מדבקות A4.
 *
 * המידות במילימטרים כי היעד הוא נייר, לא מסך. התאים ריבועיים כברירת מחדל אבל
 * הפריסה מקבלת יחס גובה-רוחב, כי קוד עם כיתוב מתחתיו גבוה מרוחבו — ואם נתעלם
 * מזה הכיתוב ייחתך בדיוק בגיליון שנועד להדפסה.
 */

export interface SheetPreset {
  id: string;
  label: string;
  hint: string;
  columns: number;
  rows: number;
}

export const A4 = { widthMm: 210, heightMm: 297 } as const;

/** שוליים בטוחים למדפסות ביתיות — מתחת לכ-8 מ״מ רבות מהן חותכות. */
const MARGIN_MM = 10;
const GAP_MM = 4;

export const SHEET_PRESETS: SheetPreset[] = [
  { id: 'g2x3', label: '6 בעמוד', hint: 'שילוט שולחנות ועמדות', columns: 2, rows: 3 },
  { id: 'g3x4', label: '12 בעמוד', hint: 'מדבקות מוצר', columns: 3, rows: 4 },
  { id: 'g4x6', label: '24 בעמוד', hint: 'תגי מלאי', columns: 4, rows: 6 },
  { id: 'g5x8', label: '40 בעמוד', hint: 'תוויות זעירות', columns: 5, rows: 8 },
];

export const SHEET_BY_ID = new Map(SHEET_PRESETS.map((p) => [p.id, p]));
export const DEFAULT_SHEET = SHEET_PRESETS[1];

export interface SheetCell {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface SheetLayout {
  cells: SheetCell[];
  perPage: number;
  /** רוחב התא בפועל — מוצג למשתמש כדי שידע אם הקוד ייצא קטן מדי לסריקה */
  cellWidthMm: number;
}

/**
 * מחשב את מיקומי התאים בעמוד אחד.
 *
 * `ratio` הוא גובה חלקי רוחב של מה שמודפס בתא. התא הסופי הוא הגדול ביותר
 * ששומר על היחס ונכנס גם ברוחב וגם בגובה, והרשת כולה ממורכזת — אחרת גיליון
 * עם יחס לא מתאים היה נדבק לפינה השמאלית העליונה.
 */
export function layoutSheet(preset: SheetPreset, ratio = 1): SheetLayout {
  const usableW = A4.widthMm - MARGIN_MM * 2 - GAP_MM * (preset.columns - 1);
  const usableH = A4.heightMm - MARGIN_MM * 2 - GAP_MM * (preset.rows - 1);

  const byWidth = usableW / preset.columns;
  const byHeight = usableH / preset.rows / ratio;
  const width = Math.min(byWidth, byHeight);
  const height = width * ratio;

  const gridW = width * preset.columns + GAP_MM * (preset.columns - 1);
  const gridH = height * preset.rows + GAP_MM * (preset.rows - 1);
  const originX = (A4.widthMm - gridW) / 2;
  const originY = (A4.heightMm - gridH) / 2;

  const cells: SheetCell[] = [];
  for (let row = 0; row < preset.rows; row++) {
    for (let column = 0; column < preset.columns; column++) {
      cells.push({
        xMm: originX + column * (width + GAP_MM),
        yMm: originY + row * (height + GAP_MM),
        widthMm: width,
        heightMm: height,
      });
    }
  }

  return { cells, perPage: cells.length, cellWidthMm: width };
}

/**
 * הרזולוציה שבה כדאי לרנדר תא, כדי שההדפסה תצא ב-300DPI לפחות.
 *
 * החסם העליון קיים כי גיליון של 40 תאים ברזולוציה מלאה הוא מאות מגה-בייט
 * בזיכרון לפני הדחיסה.
 */
export function cellPixels(widthMm: number, dpi = 300): number {
  return Math.min(1400, Math.round((widthMm / 25.4) * dpi));
}

/**
 * גודל המודול הבודד במילימטרים.
 *
 * זה ולא גודל המדבקה הוא מה שקובע אם טלפון יצליח לסרוק: קוד של 25 מ״מ עם
 * כתובת קצרה נסרק בקלות, ואותם 25 מ״מ עם כתובת ארוכה כפול מודולים נכשלים.
 * `boardSize` הוא רוחב הלוח ביחידות מודול, כולל אזור השקט.
 */
export function moduleMillimeters(cellWidthMm: number, boardSize: number): number {
  return cellWidthMm / boardSize;
}

/** מתחת לזה הסריקה תלויה במדפסת ובמצלמה — סף מקובל בתקני הדפסת QR. */
export const MIN_MODULE_MM = 0.5;
