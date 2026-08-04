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
  | 'custom1'
  | 'custom2';

export interface CardField {
  key: FieldKey;
  label: string;
  placeholder: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

/** השדות המוכנים שהמשתמש ממלא — במקום להקליד כל טקסט מאפס. */
export const CARD_FIELDS: CardField[] = [
  { key: 'name', label: 'שם', placeholder: 'דנה כהן', dir: 'auto' },
  { key: 'title', label: 'תפקיד', placeholder: 'מעצבת גרפית', dir: 'auto' },
  { key: 'company', label: 'עסק', placeholder: 'סטודיו דנה', dir: 'auto' },
  { key: 'phone', label: 'טלפון', placeholder: '050-1234567', dir: 'ltr' },
  { key: 'email', label: 'אימייל', placeholder: 'dana@example.com', dir: 'ltr' },
  { key: 'website', label: 'אתר', placeholder: 'example.co.il', dir: 'ltr' },
  { key: 'address', label: 'כתובת', placeholder: 'הרצל 1, תל אביב', dir: 'auto' },
  { key: 'tagline', label: 'משפט חופשי', placeholder: 'סרקו לתיק העבודות', dir: 'auto' },
  { key: 'custom1', label: 'טקסט נוסף', placeholder: '', dir: 'auto' },
  { key: 'custom2', label: 'טקסט נוסף', placeholder: '', dir: 'auto' },
];

export type CardValues = Partial<Record<FieldKey, string>>;

export type TextAlign = 'start' | 'center' | 'end';

export interface TextElement {
  kind: 'text';
  id: string;
  /** מאיזה שדה נשאב הטקסט */
  field: FieldKey;
  /** אחוזים מרוחב הכרטיס */
  x: number;
  y: number;
  /** רוחב מרבי לגלישת שורות, באחוזים */
  width: number;
  /** גודל הגופן באחוזים מרוחב הכרטיס */
  size: number;
  weight: 400 | 500 | 600 | 700 | 800;
  color: string;
  align: TextAlign;
  /** אותיות גדולות ומרווח — לכיתובים משניים */
  tracking?: number;
  /** אטימות, לטקסט משני */
  opacity?: number;
  font?: 'display' | 'sans';
}

export interface QrElement {
  kind: 'qr';
  id: string;
  x: number;
  y: number;
  /** צלע הקוד באחוזים מרוחב הכרטיס */
  size: number;
}

export interface ShapeElement {
  kind: 'shape';
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  /** עיגול פינות באחוזים מרוחב הכרטיס */
  radius?: number;
  opacity?: number;
}

export type CardElement = TextElement | QrElement | ShapeElement;

export interface CardTemplate {
  id: string;
  name: string;
  blurb: string;
  /** מידות פיזיות במילימטרים — הכרטיס נועד להדפסה */
  widthMm: number;
  heightMm: number;
  background: string;
  /**
   * רקע מאחורי הקוד בכרטיס.
   *
   * צבע הקוד עצמו מגיע תמיד מהעיצוב שהמשתמש בחר — תבנית שדורסת את הבחירה
   * שלו הייתה מפתיעה, והוא כבר טרח לבחור.
   */
  qrBackground: string | null;
  elements: CardElement[];
  /** שדות שהתבנית מציגה — לסינון טופס העריכה */
  usesFields: FieldKey[];
}

/** מצב העריכה של המשתמש מעל התבנית. */
export interface CardState {
  templateId: string;
  values: CardValues;
  /** דריסת מיקום וגודל של הקוד, אם המשתמש הזיז אותו */
  qrOverride: { x: number; y: number; size: number } | null;
}
