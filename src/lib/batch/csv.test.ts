import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseBatch, parseDelimited } from './csv';

describe('detectDelimiter', () => {
  it('פסיק כברירת מחדל', () => {
    expect(detectDelimiter('a,b\nc,d')).toBe(',');
  });

  it('מזהה פסיק-נקודה — מה שאקסל בעברית מייצא', () => {
    expect(detectDelimiter('כתובת;שם\nhttps://a.com;אלף')).toBe(';');
  });

  it('מזהה טאב — הדבקה ישירה מגיליון', () => {
    expect(detectDelimiter('https://a.com\tאלף')).toBe('\t');
  });

  it('רשימה בלי מפרידים אינה מזוהה כטבלה', () => {
    // כתובות מלאות בנקודות ולוכסנים; מפריד שגוי כאן היה שובר כל שורה
    expect(detectDelimiter('https://a.com/x\nhttps://b.com/y')).toBe(',');
  });
});

describe('parseDelimited', () => {
  it('מפרק שורות ושדות', () => {
    expect(parseDelimited('a,b\nc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('שדה במרכאות שומר על המפריד שבתוכו', () => {
    // כתובת עם פסיק בפרמטר היא המקרה שמפיל פרסר נאיבי
    expect(parseDelimited('"https://a.com/?q=1,2",שם', ',')).toEqual([
      ['https://a.com/?q=1,2', 'שם'],
    ]);
  });

  it('מרכאות כפולות בתוך שדה הן מרכאה אחת', () => {
    expect(parseDelimited('"a""b",c', ',')).toEqual([['a"b', 'c']]);
  });

  it('שורה חדשה בתוך מרכאות אינה שוברת רשומה', () => {
    expect(parseDelimited('"שורה\nשנייה",b', ',')).toEqual([['שורה\nשנייה', 'b']]);
  });

  it('מנרמל CRLF ומסיר BOM', () => {
    expect(parseDelimited('﻿a,b\r\nc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseBatch', () => {
  it('רשימת ערכים פשוטה — שורה לכל קוד', () => {
    const { rows, usedHeader } = parseBatch('https://a.com\nhttps://b.com');
    expect(usedHeader).toBe(false);
    expect(rows).toEqual([
      { value: 'https://a.com', label: '' },
      { value: 'https://b.com', label: '' },
    ]);
  });

  it('עמודה שנייה היא הכיתוב', () => {
    expect(parseBatch('https://a.com, שולחן 1').rows[0]).toEqual({
      value: 'https://a.com',
      label: 'שולחן 1',
    });
  });

  it('מזהה כותרת בעברית ומכבד את סדר העמודות', () => {
    const { rows, usedHeader } = parseBatch('שם,קישור\nאלף,https://a.com');
    expect(usedHeader).toBe(true);
    expect(rows).toEqual([{ value: 'https://a.com', label: 'אלף' }]);
  });

  it('מזהה כותרת באנגלית בכל צורת כתיבה', () => {
    const { rows } = parseBatch('Label,URL\nא,https://a.com');
    expect(rows).toEqual([{ value: 'https://a.com', label: 'א' }]);
  });

  it('שורה ראשונה שאינה כותרת מוכרת נשארת נתון', () => {
    // הדבקת רשימת שמות שמתחילה במשהו שנראה ככותרת לא אמורה למחוק פריט
    const { rows, usedHeader } = parseBatch('https://a.com\nhttps://b.com');
    expect(usedHeader).toBe(false);
    expect(rows).toHaveLength(2);
  });

  it('מדלג על שורות בלי ערך וסופר אותן', () => {
    const { rows, skipped } = parseBatch('https://a.com\n\n,שם בלי כתובת\nhttps://b.com');
    expect(rows).toHaveLength(2);
    expect(skipped).toBe(1);
  });

  it('קלט ריק אינו זורק', () => {
    expect(parseBatch('   ')).toMatchObject({ rows: [], skipped: 0 });
  });
});
