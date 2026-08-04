/**
 * קריאת רשימת הפריטים לייצור באצווה.
 *
 * המשתמש הטיפוסי כאן לא מייצא CSV מוקפד — הוא מדביק עמודה שהעתיק מגיליון,
 * או שומר קובץ מאקסל בעברית (שמפריד בפסיק-נקודה). לכן המפריד מזוהה לבד, שורה
 * ריקה מדולגת, וכותרת מזוהה רק אם היא באמת נראית ככותרת. קלט של שורה אחת בלי
 * מפרידים הוא פשוט רשימת ערכים — המקרה הנפוץ ביותר.
 */

/**
 * מגבלת פריטים לריצה אחת.
 *
 * מעל זה הדפדפן מבלה דקות ברינדור ותופח בזיכרון — ובטלפון זה נגמר בקריסת
 * הלשונית, כלומר באובדן כל העבודה. עדיף לחתוך במפורש ולומר למשתמש.
 */
export const MAX_BATCH = 250;

export interface BatchRow {
  /** הערך שייכנס לקוד */
  value: string;
  /** כיתוב אופציונלי — לשם הקובץ ולכיתוב מתחת לקוד */
  label: string;
}

export interface BatchParse {
  rows: BatchRow[];
  /** שורות שדולגו כי לא היה בהן ערך */
  skipped: number;
  delimiter: string;
  /** האם השורה הראשונה זוהתה ככותרת ולא כנתון */
  usedHeader: boolean;
}

const VALUE_HEADERS = ['value', 'url', 'link', 'target', 'data', 'text', 'qr', 'קישור', 'ערך', 'כתובת', 'לינק', 'תוכן'];
const LABEL_HEADERS = ['label', 'name', 'title', 'caption', 'כיתוב', 'שם', 'כותרת', 'תווית', 'תיאור'];

/**
 * מזהה את המפריד לפי השורה הראשונה.
 *
 * ספירה על כל הקובץ הייתה מטעה: כתובות מכילות פסיקים ונקודתיים, ומספיק שורה
 * אחת חריגה כדי להטות את הרוב. השורה הראשונה היא הכותרת או הרשומה הראשונה,
 * ובשתיהן מספר המפרידים משקף את מבנה הקובץ.
 */
export function detectDelimiter(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const counts = ['\t', ';', ','].map((d) => ({ d, n: line.split(d).length - 1 }));
  const best = counts.reduce((a, b) => (b.n > a.n ? b : a));
  return best.n > 0 ? best.d : ',';
}

/**
 * פירוק טקסט מופרד לשדות, כולל מרכאות.
 *
 * שדה במרכאות עשוי להכיל את המפריד ואף שורה חדשה, ומרכאות כפולות בתוכו הן
 * מרכאה אחת. בלי זה כתובת עם פסיק בפרמטר הייתה נשברת לשניים.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const normalize = (cell: string): string => cell.trim().toLowerCase().replace(/[_\s-]+/g, '');

function headerIndex(cells: string[], names: string[]): number {
  return cells.findIndex((cell) => names.includes(normalize(cell)));
}

export function parseBatch(text: string): BatchParse {
  const delimiter = detectDelimiter(text);
  const table = parseDelimited(text, delimiter).filter((row) => row.some((c) => c.trim() !== ''));

  if (table.length === 0) {
    return { rows: [], skipped: 0, delimiter, usedHeader: false };
  }

  const first = table[0];
  const valueHeader = headerIndex(first, VALUE_HEADERS);
  const labelHeader = headerIndex(first, LABEL_HEADERS);
  // כותרת מזוהה רק לפי מילה מוכרת. ניחוש לפי "נראה כמו כתובת" היה מוחק את
  // הפריט הראשון של כל מי שהדביק רשימת שמות
  const usedHeader = valueHeader >= 0 || labelHeader >= 0;

  const valueColumn = valueHeader >= 0 ? valueHeader : labelHeader === 0 ? 1 : 0;
  const labelColumn = labelHeader >= 0 ? labelHeader : valueColumn === 0 ? 1 : 0;

  const body = usedHeader ? table.slice(1) : table;
  const rows: BatchRow[] = [];
  let skipped = 0;

  for (const cells of body) {
    const value = (cells[valueColumn] ?? '').trim();
    if (!value) {
      skipped++;
      continue;
    }
    rows.push({ value, label: (cells[labelColumn] ?? '').trim() });
  }

  return { rows, skipped, delimiter, usedHeader };
}
