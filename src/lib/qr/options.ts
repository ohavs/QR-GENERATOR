import type { EcLevel, EyeBallShape, EyeFrameShape, ModuleShape } from './types';

/**
 * ערכי האפשרויות שהממשק מציע.
 *
 * הערכים הרציפים (גודל מודול, עיגול פינות, שוליים) נחשפים כאן כקבוצות
 * בדידות ולא כמחוונים: בטלפון בחירה מתוך ארבע אפשרויות מוגדרות מהירה
 * ומדויקת יותר מגרירה, והערכים עצמם נבחרו בטווח שנשאר סָריק.
 */

export interface Choice<T> {
  value: T;
  label: string;
}

export const MODULE_SHAPES: Array<Choice<ModuleShape>> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'dot', label: 'עיגול' },
  { value: 'fluid', label: 'זורם' },
  { value: 'classy', label: 'אלכסוני' },
  { value: 'diamond', label: 'מעוין' },
  { value: 'vbars', label: 'פסים ↕' },
  { value: 'hbars', label: 'פסים ↔' },
  { value: 'star', label: 'ניצוץ' },
  { value: 'plus', label: 'צלב' },
];

export const EYE_FRAMES: Array<Choice<EyeFrameShape>> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'circle', label: 'עיגול' },
  { value: 'leaf', label: 'עלה' },
  { value: 'shield', label: 'מגן' },
  { value: 'cut', label: 'קטום' },
];

export const EYE_BALLS: Array<Choice<EyeBallShape>> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'circle', label: 'עיגול' },
  { value: 'diamond', label: 'מעוין' },
  { value: 'leaf', label: 'עלה' },
  { value: 'flower', label: 'פרח' },
];

export const EC_LEVELS: Array<Choice<EcLevel>> = [
  { value: 'L', label: 'נמוך' },
  { value: 'M', label: 'בינוני' },
  { value: 'Q', label: 'גבוה' },
  { value: 'H', label: 'מרבי' },
];

/** גודל המודול ביחס לתא. מתחת ל‑0.78 הסריקה מתחילה להיות שברירית. */
export const DOT_SCALES: Array<Choice<number>> = [
  { value: 0.78, label: 'אוורירי' },
  { value: 0.9, label: 'רגיל' },
  { value: 1, label: 'מלא' },
];

export const CORNER_RADII: Array<Choice<number>> = [
  { value: 0, label: 'חד' },
  { value: 0.07, label: 'עדין' },
  { value: 0.15, label: 'מעוגל' },
  { value: 0.26, label: 'רך מאוד' },
];

/** התקן מחייב 4 מודולים; 2 עובד בפועל אך פוגע בזיהוי בתנאים גרועים. */
export const QUIET_ZONES: Array<Choice<number>> = [
  { value: 2, label: 'צר' },
  { value: 4, label: 'רגיל' },
  { value: 6, label: 'רחב' },
];

export const LOGO_SCALES: Array<Choice<number>> = [
  { value: 0.15, label: 'קטן' },
  { value: 0.2, label: 'בינוני' },
  { value: 0.26, label: 'גדול' },
];

export const LOGO_RADII: Array<Choice<number>> = [
  { value: 0, label: 'ריבוע' },
  { value: 0.22, label: 'מעוגל' },
  { value: 0.5, label: 'עיגול' },
];

/** מוצא את התווית של הערך הקרוב ביותר — לתצוגה בשורת ההגדרה. */
export function labelFor(choices: Array<Choice<number>>, value: number): string {
  return choices.reduce((best, c) =>
    Math.abs(c.value - value) < Math.abs(best.value - value) ? c : best,
  ).label;
}

/** בוחר את הערך הבדיד הקרוב ביותר, כדי שפקד בדיד לא "יקפוץ" מערך שמור. */
export function snapTo(choices: Array<Choice<number>>, value: number): number {
  return choices.reduce((best, c) =>
    Math.abs(c.value - value) < Math.abs(best.value - value) ? c : best,
  ).value;
}
