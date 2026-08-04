import type { Paint } from '../qr/types';

/**
 * כרטיסיות מעוצבות עם קוד QR.
 *
 * הכרטיס מתואר כדאטה טהורה ביחידות **אחוזים מרוחב הכרטיס** — לא בפיקסלים.
 * זו אותה החלטה שמאחורי מנוע ה-QR: תיאור בלתי תלוי ברזולוציה מאפשר לרנדר את
 * אותו כרטיס בתצוגה מקדימה קטנה ובקובץ הדפסה ב-300DPI, מאותו מקור בדיוק.
 *
 * שימוש ביחידה אחת (רוחב) גם לציר האנכי שומר על יחסים: טקסט בגובה 6% מרוחב
 * הכרטיס נשאר באותו יחס לקוד ה-QR שלידו, בלי קשר ליחס הצדדים.
 */

export type FieldKey =
  | 'name'
  | 'title'
  | 'company'
  | 'phone'
  | 'email'
  | 'website'
  | 'address'
  | 'tagline'
  | 'headline'
  | 'note';

export interface CardField {
  key: FieldKey;
  label: string;
  placeholder: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

/** השדות המוכנים שהמשתמש ממלא — במקום להקליד כל טקסט מאפס. */
export const CARD_FIELDS: CardField[] = [
  { key: 'headline', label: 'כותרת ראשית', placeholder: 'סרקו לתפריט', dir: 'auto' },
  { key: 'company', label: 'שם העסק', placeholder: 'קפה נחמה', dir: 'auto' },
  { key: 'tagline', label: 'שורת משנה', placeholder: 'קפה, מאפים וכל מה שביניהם', dir: 'auto' },
  { key: 'name', label: 'שם', placeholder: 'דנה כהן', dir: 'auto' },
  { key: 'title', label: 'תפקיד', placeholder: 'מעצבת גרפית', dir: 'auto' },
  { key: 'phone', label: 'טלפון', placeholder: '050-1234567', dir: 'ltr' },
  { key: 'email', label: 'אימייל', placeholder: 'dana@example.com', dir: 'ltr' },
  { key: 'website', label: 'אתר', placeholder: 'example.co.il', dir: 'ltr' },
  { key: 'address', label: 'כתובת', placeholder: 'הרצל 1, תל אביב', dir: 'auto' },
  { key: 'note', label: 'הערה קטנה', placeholder: 'פתוח א׳–ה׳ 08:00–18:00', dir: 'auto' },
];

export const FIELD_BY_KEY = new Map(CARD_FIELDS.map((f) => [f.key, f]));

export type TextAlign = 'start' | 'center' | 'end';

export interface TextElement {
  kind: 'text';
  id: string;
  /**
   * מאיזה שדה נשאב הטקסט.
   *
   * `null` = טקסט קבוע מהתבנית (`text`), שאינו ניתן לעריכה — למשל "סרקו אותי"
   * שהוא חלק מהעיצוב ולא תוכן של המשתמש.
   */
  field: FieldKey | null;
  /** טקסט קבוע כשאין שדה */
  text?: string;
  /** אחוזים מרוחב הכרטיס */
  x: number;
  y: number;
  /** רוחב מרבי לגלישת שורות, באחוזים */
  width: number;
  /** גודל הגופן באחוזים מרוחב הכרטיס */
  size: number;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  color: string;
  align: TextAlign;
  /** מרווח בין אותיות, באחוזים מרוחב הכרטיס */
  tracking?: number;
  opacity?: number;
  font?: 'display' | 'sans';
  /** גובה שורה כמכפיל של גודל הגופן */
  lineHeight?: number;
  maxLines?: number;
}

export interface QrElement {
  kind: 'qr';
  id: string;
  x: number;
  y: number;
  /** צלע הקוד באחוזים מרוחב הכרטיס */
  size: number;
  /**
   * משטח מתחת לקוד.
   *
   * על רקע צבעוני זה לא קישוט: קוד QR דורש אזור שקט בהיר סביבו, ובלי משטח
   * הרקע הכהה חודר לתוכו והסריקה נכשלת.
   */
  plate?: {
    /** ריפוד סביב הקוד באחוזים */
    padding: number;
    radius: number;
    fill: string;
  };
}

export interface ShapeElement {
  kind: 'shape';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: Paint;
  shape?: 'rect' | 'ellipse';
  /** עיגול פינות באחוזים מרוחב הכרטיס */
  radius?: number;
  opacity?: number;
}

export type CardElement = TextElement | QrElement | ShapeElement;

export interface CardTemplate {
  id: string;
  name: string;
  blurb: string;
  /** קיבוץ בגלריה */
  group: 'scan' | 'business' | 'label';
  /** מידות פיזיות במילימטרים — הכרטיס נועד להדפסה */
  widthMm: number;
  heightMm: number;
  background: Paint;
  elements: CardElement[];
  /** שדות שהתבנית מציגה — לסינון טופס העריכה, לפי סדר החשיבות */
  usesFields: FieldKey[];
  /** ערכי דוגמה לתצוגה בגלריה, כדי שהתבנית תיראה כמו שהיא נועדה להיראות */
  sample: Partial<Record<FieldKey, string>>;
}

export type CardValues = Partial<Record<FieldKey, string>>;

/** מצב העריכה של המשתמש מעל התבנית. */
export interface CardState {
  templateId: string;
  values: CardValues;
  /** דריסת מיקום וגודל של הקוד, אם המשתמש הזיז אותו */
  qrOverride: { x: number; y: number; size: number } | null;
}
