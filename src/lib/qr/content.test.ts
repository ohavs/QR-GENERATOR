import { describe, expect, it } from 'vitest';
import { CONTENT_ORDER, CONTENT_TYPES, normalizePhone } from './content';

describe('normalizePhone', () => {
  it('ממיר מספר ישראלי מקומי לפורמט בינלאומי', () => {
    expect(normalizePhone('050-123-4567')).toBe('972501234567');
  });

  it('משאיר מספר בינלאומי כמו שהוא', () => {
    expect(normalizePhone('+972501234567')).toBe('972501234567');
    expect(normalizePhone('00972501234567')).toBe('972501234567');
  });

  it('מסיר תווי עיצוב', () => {
    expect(normalizePhone('(050) 123 4567')).toBe('972501234567');
  });
});

describe('כל סוג תוכן', () => {
  it('מחזיר מחרוזת ריקה כשאין ערכים — אחרת נוצר קוד תקין שמצביע לשומקום', () => {
    for (const kind of CONTENT_ORDER) {
      expect(CONTENT_TYPES[kind].encode({}), kind).toBe('');
    }
  });

  it('מוגדר עם שדה חובה אחד לפחות', () => {
    for (const kind of CONTENT_ORDER) {
      expect(CONTENT_TYPES[kind].fields.some((f) => f.required), kind).toBe(true);
    }
  });
});

describe('קישור', () => {
  const { encode } = CONTENT_TYPES.link;

  it('משלים https לדומיין חשוף', () => {
    expect(encode({ url: 'example.co.il' })).toBe('https://example.co.il');
  });

  it('לא נוגע בכתובת עם סכימה', () => {
    expect(encode({ url: 'http://example.com' })).toBe('http://example.com');
    expect(encode({ url: 'mailto:a@b.com' })).toBe('mailto:a@b.com');
  });

  it('משאיר טקסט חופשי כמו שהוא', () => {
    expect(encode({ url: 'לא כתובת' })).toBe('לא כתובת');
  });
});

describe('WiFi', () => {
  const { encode } = CONTENT_TYPES.wifi;

  it('בונה מחרוזת תקנית', () => {
    expect(encode({ ssid: 'Home', password: 'secret', security: 'WPA' })).toBe(
      'WIFI:T:WPA;S:Home;P:secret;;',
    );
  });

  it('מבריח תווים ששוברים את הפורמט', () => {
    // נקודה-פסיק ופסיק הם מפרידים בתקן; בלי בריחה הרשת נקראת שגוי
    expect(encode({ ssid: 'a;b', password: 'c,d', security: 'WPA' })).toBe(
      'WIFI:T:WPA;S:a\\;b;P:c\\,d;;',
    );
  });

  it('משמיט סיסמה ברשת פתוחה', () => {
    expect(encode({ ssid: 'Free', password: 'ignored', security: 'nopass' })).toBe(
      'WIFI:T:nopass;S:Free;;',
    );
  });

  it('מסמן רשת מוסתרת', () => {
    expect(encode({ ssid: 'Hidden', security: 'WPA', hidden: 'true' })).toContain('H:true;');
  });
});

describe('וואטסאפ', () => {
  const { encode } = CONTENT_TYPES.whatsapp;

  it('מנרמל את המספר ומקודד את ההודעה', () => {
    expect(encode({ phone: '0501234567', message: 'שלום' })).toBe(
      'https://wa.me/972501234567?text=%D7%A9%D7%9C%D7%95%D7%9D',
    );
  });

  it('בלי הודעה — בלי פרמטר', () => {
    expect(encode({ phone: '0501234567' })).toBe('https://wa.me/972501234567');
  });
});

describe('כרטיס ביקור', () => {
  const { encode } = CONTENT_TYPES.vcard;

  it('בונה vCard 3.0 תקין', () => {
    const result = encode({ firstName: 'דנה', lastName: 'כהן', phone: '0501234567' });
    expect(result.startsWith('BEGIN:VCARD\nVERSION:3.0\n')).toBe(true);
    expect(result.endsWith('\nEND:VCARD')).toBe(true);
    expect(result).toContain('N:כהן;דנה;;;');
    expect(result).toContain('FN:דנה כהן');
  });

  it('מספיק שם פרטי בלבד', () => {
    expect(encode({ firstName: 'דנה' })).toContain('FN:דנה');
  });

  it('מדלג על שדות ריקים', () => {
    const result = encode({ firstName: 'דנה' });
    expect(result).not.toContain('TEL');
    expect(result).not.toContain('ORG');
  });

  it('מבריח פסיקים ונקודה-פסיק בשמות', () => {
    expect(encode({ firstName: 'א;ב', lastName: 'ג,ד' })).toContain('N:ג\\,ד;א\\;ב;;;');
  });

  it('משלים https לאתר', () => {
    expect(encode({ firstName: 'דנה', url: 'example.co.il' })).toContain('URL:https://example.co.il');
  });
});

describe('מיקום', () => {
  const { encode } = CONTENT_TYPES.geo;

  it('בונה geo תקין', () => {
    expect(encode({ lat: '32.0853', lon: '34.7818' })).toBe('geo:32.0853,34.7818');
  });

  it('שדה ריק אינו קואורדינטה 0', () => {
    // Number('') הוא 0 — בלי בדיקה מפורשת נוצר קוד תקין לנקודה באוקיינוס
    expect(encode({ lat: '', lon: '' })).toBe('');
    expect(encode({ lat: '32', lon: '' })).toBe('');
  });

  it('דוחה ערכים מחוץ לטווח', () => {
    expect(encode({ lat: '200', lon: '34' })).toBe('');
    expect(encode({ lat: '32', lon: '999' })).toBe('');
    expect(encode({ lat: 'abc', lon: '34' })).toBe('');
  });

  it('מקבל קואורדינטות שליליות', () => {
    expect(encode({ lat: '-33.86', lon: '-151.2' })).toBe('geo:-33.86,-151.2');
  });
});

describe('אירוע', () => {
  const { encode } = CONTENT_TYPES.event;

  it('בונה VEVENT עם תאריכי UTC', () => {
    const result = encode({ title: 'כנס', start: '2026-09-01T10:00', end: '2026-09-01T12:00' });
    expect(result.startsWith('BEGIN:VEVENT\n')).toBe(true);
    expect(result.endsWith('\nEND:VEVENT')).toBe(true);
    expect(result).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  it('מדלג על תאריך לא תקין במקום לזרוק', () => {
    const result = encode({ title: 'כנס', start: 'לא תאריך' });
    expect(result).toContain('SUMMARY:כנס');
    expect(result).not.toContain('DTSTART');
  });
});

describe('SMS ואימייל', () => {
  it('SMS משתמש ב-SMSTO שסורקים מזהים בעקביות', () => {
    expect(CONTENT_TYPES.sms.encode({ phone: '050-1234567', message: 'היי' })).toBe(
      'SMSTO:0501234567:היי',
    );
  });

  it('אימייל מקודד נושא וגוף כפרמטרים', () => {
    const result = CONTENT_TYPES.email.encode({ to: 'a@b.com', subject: 'נושא', body: 'תוכן' });
    expect(result.startsWith('mailto:a@b.com?')).toBe(true);
    expect(result).toContain('subject=');
    expect(result).toContain('body=');
  });

  it('אימייל בלי נושא — בלי סימן שאלה', () => {
    expect(CONTENT_TYPES.email.encode({ to: 'a@b.com' })).toBe('mailto:a@b.com');
  });

  it('טלפון מסיר תווי עיצוב', () => {
    expect(CONTENT_TYPES.phone.encode({ phone: '(050) 123-4567' })).toBe('tel:0501234567');
  });
});
