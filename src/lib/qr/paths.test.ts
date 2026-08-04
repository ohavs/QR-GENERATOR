import { describe, expect, it } from 'vitest';
import { circle, concaveFillet, cutRect, diamond, polygon, rect, roundedRect } from './paths';

/** מוציא את כל המספרים מנתיב — לבדיקת גבולות בלי להיצמד לפורמט המדויק. */
function numbersIn(path: string): number[] {
  return [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

describe('rect', () => {
  it('סוגר את הצורה', () => {
    expect(rect(0, 0, 1, 1).endsWith('Z')).toBe(true);
  });
});

describe('roundedRect', () => {
  it('בלי רדיוס מייצר פינות חדות — בלי קשתות', () => {
    expect(roundedRect(0, 0, 10, 10, [0, 0, 0, 0])).not.toContain('A');
  });

  it('עם רדיוס מייצר ארבע קשתות', () => {
    const arcs = roundedRect(0, 0, 10, 10, [2, 2, 2, 2]).match(/A/g);
    expect(arcs).toHaveLength(4);
  });

  it('חותך רדיוס גדול מדי לחצי מהצלע הקצרה', () => {
    // בלי חיתוך, רדיוס גדול מהצלע מייצר נתיב הפוך שנראה כמו רעש
    const clamped = roundedRect(0, 0, 10, 10, [99, 99, 99, 99]);
    expect(Math.max(...numbersIn(clamped))).toBeLessThanOrEqual(10);
  });

  it('תומך ברדיוס שונה לכל פינה', () => {
    // 'classy' מסתמך על זה: מעוגל בשתי פינות נגדיות בלבד
    const arcs = roundedRect(0, 0, 10, 10, [5, 0, 5, 0]).match(/A/g);
    expect(arcs).toHaveLength(2);
  });
});

describe('circle', () => {
  it('מתחיל בקצה השמאלי ומורכב משתי חצי-קשתות', () => {
    // הנתיב יחסי (a) ולא מוחלט, כדי לחסוך בייטים בקבצי SVG גדולים
    const path = circle(5, 5, 5);
    expect(path.startsWith('M0 5')).toBe(true);
    expect(path.match(/a/g)).toHaveLength(2);
    expect(path.endsWith('Z')).toBe(true);
  });
});

describe('diamond', () => {
  it('ארבעה קודקודים במרחק הרדיוס מהמרכז', () => {
    expect(diamond(5, 5, 3)).toBe('M5 2L8 5L5 8L2 5Z');
  });
});

describe('concaveFillet', () => {
  it('דגל ה-sweep הוא 0 — הקשת מתעקלת פנימה ולא החוצה', () => {
    // sweep=1 היה הופך את הפילה לבליטה קמורה ושובר את המראה ה"זורם"
    for (const corner of [0, 1, 2, 3]) {
      expect(concaveFillet(0, 0, 1, 0.5, corner)).toMatch(/A[\d. ]+0 0 0 /);
    }
  });

  it('נשאר בתוך התא', () => {
    for (const corner of [0, 1, 2, 3]) {
      const values = numbersIn(concaveFillet(0, 0, 1, 0.5, corner));
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...values)).toBeLessThanOrEqual(1);
    }
  });

  it('חותך רדיוס גדול מהתא', () => {
    const values = numbersIn(concaveFillet(0, 0, 1, 5, 0));
    expect(Math.max(...values)).toBeLessThanOrEqual(1);
  });
});

describe('cutRect', () => {
  it('מייצר מתומן עם שמונה קודקודים', () => {
    const points = cutRect(0, 0, 10, 10, 2).match(/[ML]/g);
    expect(points).toHaveLength(8);
  });

  it('חותך קיטום גדול מדי', () => {
    const values = numbersIn(cutRect(0, 0, 10, 10, 99));
    expect(Math.max(...values)).toBeLessThanOrEqual(10);
  });
});

describe('polygon', () => {
  it('מחזיר ריק כשאין נקודות — לא נתיב פגום', () => {
    expect(polygon([])).toBe('');
  });
});

describe('עיגול עשרוני', () => {
  it('מקצץ לשלוש ספרות כדי לשמור על גודל קובץ סביר', () => {
    expect(rect(0.123456789, 0, 1, 1)).toContain('0.123');
    expect(rect(0.123456789, 0, 1, 1)).not.toContain('0.1234');
  });

  it('מנרמל אפס שלילי', () => {
    // "-0" תקין ב-SVG אבל מייצר הבדלים מיותרים בהשוואות
    expect(rect(-0.0001, 0, 1, 1)).not.toContain('-0 ');
  });
});
