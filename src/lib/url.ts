/** תוצאה של בדיקת הקלט שהמשתמש הזין. */
export interface InputCheck {
  /** הערך שייכנס בפועל לקוד */
  normalized: string;
  kind: 'url' | 'text' | 'empty';
  /** הודעה מנחה (לא שגיאה) — למשל השלמת https:// */
  note: string | null;
}

const URLISH = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const LOOKS_LIKE_DOMAIN = /^[\w֐-׿-]+(\.[\w֐-׿-]+)+(\/\S*)?$/i;

/**
 * מנרמל את הקלט: משלים `https://` לכתובות ללא סכימה, ומשאיר טקסט חופשי כמו שהוא.
 *
 * הנרמול לא חוסם — משתמש שרוצה לקודד טקסט רגיל יקבל בדיוק את מה שהקליד.
 */
export function checkInput(raw: string): InputCheck {
  const value = raw.trim();
  if (!value) return { normalized: '', kind: 'empty', note: null };

  if (URLISH.test(value)) {
    return { normalized: value, kind: 'url', note: null };
  }

  if (LOOKS_LIKE_DOMAIN.test(value)) {
    return {
      normalized: `https://${value}`,
      kind: 'url',
      note: 'הוספנו https:// בתחילת הכתובת',
    };
  }

  return { normalized: value, kind: 'text', note: null };
}

/** גרסה מקוצרת להצגה בכרטיסים ובהיסטוריה. */
export function shortenForDisplay(value: string, max = 46): string {
  const clean = value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
