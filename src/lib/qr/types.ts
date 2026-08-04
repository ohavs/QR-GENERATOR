/**
 * טיפוסי הליבה של מנוע ה-QR.
 *
 * העיצוב כולו מתואר כאן כדאטה בלבד — ללא תלות ב-DOM. אותו תיאור מוזן גם
 * לרנדרר ה-SVG (תצוגה חיה) וגם לרנדרר ה-Canvas (ייצוא), כך שמה שרואים על
 * המסך זהה בדיוק למה שיורד כקובץ.
 */

/** צורת מודול בודד בגוף הקוד. */
export type ModuleShape =
  | 'square' // ריבוע קלאסי
  | 'rounded' // ריבוע מעוגל
  | 'dot' // עיגול
  | 'diamond' // מעוין
  | 'classy' // מעוגל בשתי פינות נגדיות
  | 'fluid' // מחובר-זורם, עיגול פינות לפי שכנים
  | 'vbars' // פסים אנכיים מחוברים
  | 'hbars' // פסים אופקיים מחוברים
  | 'star' // ניצוץ ארבע-קצוות
  | 'plus'; // צלב

/** צורת המסגרת החיצונית של "העין" (תבנית האיתור 7×7). */
export type EyeFrameShape = 'square' | 'rounded' | 'circle' | 'leaf' | 'shield' | 'cut';

/** צורת הגלגל הפנימי של "העין" (3×3). */
export type EyeBallShape = 'square' | 'rounded' | 'circle' | 'diamond' | 'leaf' | 'flower';

/** רמת תיקון השגיאות. H מאפשר לוגו גדול יותר במחיר צפיפות גבוהה. */
export type EcLevel = 'L' | 'M' | 'Q' | 'H';

export interface GradientStop {
  offset: number;
  color: string;
}

/** תיאור צביעה — נתמך זהה ב-SVG וב-Canvas. */
export type Paint =
  | { type: 'solid'; color: string }
  /** angle במעלות: 0 = משמאל לימין, 90 = מלמעלה למטה */
  | { type: 'linear'; angle: number; stops: GradientStop[] }
  | { type: 'radial'; stops: GradientStop[] };

/** סגנון כיתוב/מסגרת מסביב לקוד. */
export type FrameStyle = 'none' | 'bottomBar' | 'pill' | 'ribbon' | 'outline' | 'ticket';

export interface FrameSpec {
  style: FrameStyle;
  text: string;
  textPaint: Paint;
  barPaint: Paint;
}

export interface LogoSpec {
  /** data: URL של התמונה שמצוירת בפועל */
  src: string;
  /** data: URL של הקובץ המקורי שהועלה — כדי שאפשר יהיה לבטל הסרת רקע */
  originalSrc: string;
  /** 'off' = הרקע המקורי נשמר */
  bgRemoval: 'off' | 'gentle' | 'normal' | 'strong';
  /** גודל הלוגו כאחוז מרוחב הקוד (0.12–0.3) */
  scale: number;
  /** ריפוד לבן/רקע מסביב ללוגו */
  padding: number;
  /** עיגול פינות הלוגו ביחס לגודלו (0–0.5) */
  radius: number;
  /** ניקוי המודולים מתחת ללוגו לשיפור הניגודיות */
  excavate: boolean;
}

/** עיצוב מלא של קוד QR. */
export interface QrDesign {
  id: string;
  /** שם העיצוב בעברית */
  name: string;
  /** תיאור קצר לגלריה */
  blurb: string;
  tags: string[];
  moduleShape: ModuleShape;
  eyeFrame: EyeFrameShape;
  eyeBall: EyeBallShape;
  /** גודל המודול ביחס לתא (0.55–1). ערך נמוך = "אווריריות" בין הנקודות */
  dotScale: number;
  body: Paint;
  eyeFramePaint: Paint;
  eyeBallPaint: Paint;
  /** null = רקע שקוף */
  background: Paint | null;
  /** אזור שקט סביב הקוד, ביחידות מודולים (מינימום מומלץ: 2) */
  quietZone: number;
  /** עיגול פינות מסגרת הרקע, כאחוז מהגודל הכולל (0–0.5) */
  cornerRadius: number;
  /** מסגרת דקורטיבית סביב לוח הרקע */
  plate?: { strokePaint: Paint; width: number; inset: number; dashed?: boolean };
  frameStyle: FrameStyle;
  frameBarPaint: Paint;
  frameTextPaint: Paint;
  ecLevel: EcLevel;
  /** צבע לרקע כהה — משמש לתצוגה מקדימה בגלריה */
  previewBg: string;
}

/** כל מה שהמשתמש יכול לשנות מעל העיצוב הנבחר. */
export interface QrOptions {
  value: string;
  design: QrDesign;
  /** דריסת צבעים; undefined = כמו בעיצוב */
  bodyOverride?: Paint;
  eyeFrameOverride?: Paint;
  eyeBallOverride?: Paint;
  backgroundOverride?: Paint | null;
  /** true = ללא רקע כלל (PNG/SVG שקופים) */
  transparentBackground: boolean;
  quietZone: number;
  ecLevel: EcLevel;
  moduleShape?: ModuleShape;
  eyeFrame?: EyeFrameShape;
  eyeBall?: EyeBallShape;
  dotScale?: number;
  cornerRadius?: number;
  logo: LogoSpec | null;
  frame: { enabled: boolean; text: string };
}

/** מקטע מצויר יחיד — צורה + צביעה. */
export interface PaintedPath {
  d: string;
  paint: Paint;
  /** ציור כקו מתאר במקום מילוי */
  stroke?: { width: number; dash?: number[] };
  /** חיתוך: הצורה מציירת חור בצורה שקדמה לה */
  evenOdd?: boolean;
}

/** תוצאת החישוב הגאומטרי — הכל ביחידות "מודול", ללא פיקסלים. */
export interface QrGeometry {
  /** מספר המודולים לצלע (ללא אזור שקט) */
  moduleCount: number;
  /** גודל הלוח הכולל ביחידות מודול (כולל אזור שקט) */
  boardSize: number;
  /** גובה כולל ביחידות מודול (לוח + מסגרת כיתוב אם קיימת) */
  boardHeight: number;
  /** היסט הקוד בתוך הלוח */
  offset: number;
  /** רקע הלוח (אם קיים) */
  background: PaintedPath | null;
  plate: PaintedPath | null;
  body: PaintedPath;
  eyeFrames: PaintedPath;
  eyeBalls: PaintedPath;
  /** רכיבי מסגרת הכיתוב */
  frame: {
    shapes: PaintedPath[];
    text: {
      value: string;
      paint: Paint;
      /** מרכז הטקסט ביחידות מודול */
      x: number;
      y: number;
      /** גובה הפונט ביחידות מודול */
      fontSize: number;
      weight: number;
    } | null;
  } | null;
  /** אזור הלוגו ביחידות מודול */
  logo: {
    x: number;
    y: number;
    size: number;
    radius: number;
    padding: number;
    src: string;
    /** צבע לוח הריפוד מאחורי הלוגו — נגזר מרקע הקוד, לא לבן קבוע */
    plateColor: string;
  } | null;
}
