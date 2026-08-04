/**
 * מעקב אחרי תפוגת חשבון אנונימי.
 *
 * בקונסולה הופעל ניקוי אוטומטי של חשבונות אנונימיים אחרי 30 יום. הפרט
 * המכריע: הספירה היא **מאי-פעילות**, לא ממועד היצירה — כל כניסה לאפליקציה
 * מאפסת אותה. לכן אי אפשר להתריע למי שכבר מזמן לא נכנס, והתרומה האמיתית של
 * ההתראה היא בשתי נקודות:
 *
 * 1. **תזכורת שוטפת** למי שנכנס — שיקשר חשבון לפני שייעלם לחודש.
 * 2. **אזהרה בדיעבד** למי שחזר אחרי היעדרות ארוכה: "היית 26 יום בחוץ, עוד
 *    ארבעה והחשבון היה נמחק". זו הפעם היחידה שהסיכון מוחשי, ולכן היא
 *    הרגע היעיל ביותר להציע קישור חשבון.
 *
 * מה נמחק בפועל: **החשבון**, לא הקודים. קודים מודפסים ימשיכו להפנות כרגיל,
 * כי פונקציית ההפניה אינה בודקת בעלות. מה שאובד הוא היכולת לערוך אותם,
 * לכבות אותם או לראות נתוני סריקה — לנצח.
 */

const VISIT_KEY = 'qr-studio:anon:last-visit';
const DISMISS_KEY = 'qr-studio:anon:dismissed-at';

/** ימי אי-פעילות עד המחיקה, כפי שהוגדר בקונסולת Firebase. */
export const EXPIRY_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

export type ExpiryUrgency = 'none' | 'reminder' | 'soon' | 'critical';

export interface ExpiryNotice {
  urgency: ExpiryUrgency;
  /** כמה ימים המשתמש לא נכנס לפני הכניסה הנוכחית */
  daysAway: number;
  /** כמה ימים נשארו לחשבון אילו לא היה נכנס עכשיו */
  daysThatRemained: number;
}

function readNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // מצב פרטי — המעקב פשוט לא ישרוד רענון
  }
}

/**
 * רושם את הביקור הנוכחי ומחזיר את פער הזמן מהביקור הקודם.
 *
 * חייב להיקרא פעם אחת בלבד בעליית האפליקציה: קריאה שנייה תראה את הביקור
 * הנוכחי כביקור הקודם ותאפס את הפער.
 */
export function recordVisit(now = Date.now()): number {
  const previous = readNumber(VISIT_KEY);
  writeNumber(VISIT_KEY, now);
  if (previous === null) return 0;
  return Math.max(0, Math.floor((now - previous) / DAY));
}

/**
 * מחליט אם להציג התראה, ובאיזו דחיפות.
 *
 * הקצב עולה עם הסיכון: תזכורת רגילה חוזרת פעם בשבוע, אזהרה אחרי היעדרות
 * ארוכה חוזרת אחרי יומיים, וחזרה מרגע לפני מחיקה מוצגת בכל כניסה עד שמקשרים
 * חשבון. התראה שמוצגת יותר מדי הופכת לרעש שסוגרים אוטומטית.
 */
export function evaluateExpiry(daysAway: number, now = Date.now()): ExpiryNotice {
  const daysThatRemained = Math.max(0, EXPIRY_DAYS - daysAway);

  const urgency: ExpiryUrgency =
    daysAway >= EXPIRY_DAYS - 1
      ? 'critical'
      : daysAway >= EXPIRY_DAYS - 7
        ? 'soon'
        : 'reminder';

  const dismissedAt = readNumber(DISMISS_KEY);
  if (dismissedAt !== null) {
    const daysSinceDismiss = (now - dismissedAt) / DAY;
    const quietDays = urgency === 'critical' ? 0 : urgency === 'soon' ? 2 : 7;
    if (daysSinceDismiss < quietDays) {
      return { urgency: 'none', daysAway, daysThatRemained };
    }
  }

  return { urgency, daysAway, daysThatRemained };
}

export function dismissExpiryNotice(now = Date.now()): void {
  writeNumber(DISMISS_KEY, now);
}

/** מנקה את המעקב — אחרי קישור חשבון אין יותר מה להתריע עליו. */
export function clearExpiryTracking(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    // לא קריטי
  }
}

/** נוסח ההתראה לפי הדחיפות. */
export function expiryMessage(notice: ExpiryNotice): { title: string; body: string } {
  if (notice.urgency === 'critical') {
    return {
      title: `עוד ${notice.daysThatRemained === 0 ? 'פחות מיום' : 'יום אחד'} והחשבון היה נמחק`,
      body:
        `לא נכנסת ${notice.daysAway} ימים, והחשבון האנונימי נמחק אחרי ${EXPIRY_DAYS} ימים ללא כניסה. ` +
        'הקודים המודפסים ימשיכו לעבוד, אבל לא תוכל יותר לערוך אותם או לראות כמה סרקו.',
    };
  }

  if (notice.urgency === 'soon') {
    return {
      title: `נשארו ${notice.daysThatRemained} ימים לחשבון`,
      body:
        `לא נכנסת ${notice.daysAway} ימים, וחשבון אנונימי נמחק אחרי ${EXPIRY_DAYS} ימים ללא כניסה. ` +
        'הקודים המודפסים ימשיכו לעבוד, אבל תאבד את היכולת לערוך אותם ולראות נתוני סריקה.',
    };
  }

  return {
    title: 'החשבון שלך אנונימי',
    body:
      `הוא יימחק אוטומטית אחרי ${EXPIRY_DAYS} ימים בלי כניסה. הקודים המודפסים ימשיכו לעבוד, ` +
      'אבל לא תוכל לערוך אותם או לראות נתוני סריקה.',
  };
}
