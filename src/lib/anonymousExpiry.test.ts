import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissExpiryNotice,
  evaluateExpiry,
  EXPIRY_DAYS,
  expiryMessage,
  recordVisit,
} from './anonymousExpiry';

const DAY = 24 * 60 * 60 * 1000;

/** localStorage מינימלי — הבדיקות רצות ב-Node ללא DOM. */
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

describe('recordVisit', () => {
  it('ביקור ראשון אינו מדווח על היעדרות', () => {
    expect(recordVisit(Date.now())).toBe(0);
  });

  it('מודד את הפער מהביקור הקודם בימים', () => {
    const now = Date.now();
    recordVisit(now - 12 * DAY);
    expect(recordVisit(now)).toBe(12);
  });
});

describe('evaluateExpiry', () => {
  it('היעדרות קצרה — תזכורת רגילה בלבד', () => {
    expect(evaluateExpiry(3).urgency).toBe('reminder');
  });

  it('היעדרות ארוכה — אזהרה', () => {
    expect(evaluateExpiry(EXPIRY_DAYS - 5).urgency).toBe('soon');
  });

  it('חזרה יום לפני המחיקה — דחיפות מרבית', () => {
    expect(evaluateExpiry(EXPIRY_DAYS - 1).urgency).toBe('critical');
  });

  it('מחשב כמה ימים נשארו לחשבון', () => {
    expect(evaluateExpiry(22).daysThatRemained).toBe(EXPIRY_DAYS - 22);
  });

  it('לעולם לא מדווח על ימים שליליים', () => {
    expect(evaluateExpiry(EXPIRY_DAYS + 10).daysThatRemained).toBe(0);
  });
});

describe('קצב ההצגה אחרי סגירה', () => {
  it('תזכורת רגילה שקטה לשבוע', () => {
    const now = Date.now();
    dismissExpiryNotice(now);
    expect(evaluateExpiry(2, now + 3 * DAY).urgency).toBe('none');
    expect(evaluateExpiry(2, now + 8 * DAY).urgency).toBe('reminder');
  });

  it('אזהרה חוזרת כבר אחרי יומיים', () => {
    const now = Date.now();
    dismissExpiryNotice(now);
    expect(evaluateExpiry(EXPIRY_DAYS - 5, now + 1 * DAY).urgency).toBe('none');
    expect(evaluateExpiry(EXPIRY_DAYS - 5, now + 3 * DAY).urgency).toBe('soon');
  });

  it('דחיפות מרבית מתעלמת מסגירה', () => {
    // מי שחזר יום לפני מחיקה יראה את ההודעה בכל כניסה עד שיקשר חשבון
    const now = Date.now();
    dismissExpiryNotice(now);
    expect(evaluateExpiry(EXPIRY_DAYS - 1, now + 60_000).urgency).toBe('critical');
  });
});

describe('expiryMessage', () => {
  it('מבהיר שהקודים המודפסים ממשיכים לעבוד', () => {
    // זו הנקודה הכי חשובה בהודעה: מה שנמחק הוא החשבון, לא ההפניה
    for (const days of [2, EXPIRY_DAYS - 5, EXPIRY_DAYS - 1]) {
      const { body } = expiryMessage(evaluateExpiry(days));
      expect(body, `${days} ימים`).toContain('ימשיכו לעבוד');
    }
  });

  it('מציין את מספר הימים שנותרו באזהרה', () => {
    const notice = evaluateExpiry(EXPIRY_DAYS - 4);
    expect(expiryMessage(notice).title).toContain('4');
  });
});
