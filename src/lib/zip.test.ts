import { describe, expect, it } from 'vitest';
import { buildZip, crc32 } from './zip';

/**
 * ZIP שגוי נפתח לפעמים ונשבר לפעמים, תלוי בכלי — בדיוק סוג התקלה שמגיעה
 * מהמשתמש ולא מהבדיקות. לכן כאן מפרקים את הפלט חזרה ומאמתים את השדות שכל
 * קורא מסתמך עליהם: החתימות, ה-CRC, והיסט הרשומה בטבלה המרכזית.
 */

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

async function read(blob: Blob): Promise<DataView> {
  return new DataView(await blob.arrayBuffer());
}

describe('crc32', () => {
  it('ערכים ידועים', () => {
    expect(crc32(bytes(''))).toBe(0);
    expect(crc32(bytes('a'))).toBe(0xe8b7be43);
    expect(crc32(bytes('hello world'))).toBe(0x0d4a1185);
  });

  it('מחזיר תמיד מספר חיובי', () => {
    // הסיבית העליונה דולקת כאן; בלי >>> 0 היה נכתב מספר שלילי לקובץ
    expect(crc32(bytes('a'))).toBeGreaterThan(0);
  });
});

describe('buildZip', () => {
  it('חתימת כותרת מקומית בתחילת הקובץ', async () => {
    const view = await read(buildZip([{ name: 'a.txt', data: bytes('hello') }]));
    expect(view.getUint32(0, true)).toBe(0x04034b50);
  });

  it('רשומת הסיום סופרת את הקבצים ומצביעה על הטבלה המרכזית', async () => {
    const zip = buildZip([
      { name: 'a.txt', data: bytes('hello') },
      { name: 'b.txt', data: bytes('world!') },
    ]);
    const view = await read(zip);
    const eocd = view.byteLength - 22;

    expect(view.getUint32(eocd, true)).toBe(0x06054b50);
    expect(view.getUint16(eocd + 8, true)).toBe(2);
    expect(view.getUint16(eocd + 10, true)).toBe(2);

    const centralOffset = view.getUint32(eocd + 16, true);
    const centralSize = view.getUint32(eocd + 12, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    expect(centralOffset + centralSize).toBe(eocd);
  });

  it('ההיסט בטבלה המרכזית מצביע בדיוק על הכותרת המקומית', async () => {
    const zip = buildZip([
      { name: 'a.txt', data: bytes('hello') },
      { name: 'b.txt', data: bytes('world!') },
    ]);
    const view = await read(zip);
    const eocd = view.byteLength - 22;
    let cursor = view.getUint32(eocd + 16, true);

    for (const name of ['a.txt', 'b.txt']) {
      const nameLength = view.getUint16(cursor + 28, true);
      const localOffset = view.getUint32(cursor + 42, true);
      expect(view.getUint32(localOffset, true)).toBe(0x04034b50);

      const localName = new TextDecoder().decode(
        new Uint8Array(view.buffer, localOffset + 30, view.getUint16(localOffset + 26, true)),
      );
      expect(localName).toBe(name);
      cursor += 46 + nameLength;
    }
  });

  it('הגודל וה-CRC בכותרת תואמים לנתונים', async () => {
    const data = bytes('hello world');
    const view = await read(buildZip([{ name: 'a.txt', data }]));

    expect(view.getUint32(14, true)).toBe(crc32(data));
    expect(view.getUint32(18, true)).toBe(data.length); // דחוס
    expect(view.getUint32(22, true)).toBe(data.length); // מקורי
  });

  it('דגל UTF-8 דלוק — בלעדיו שם בעברית נפתח כג׳יבריש', async () => {
    const view = await read(buildZip([{ name: 'שולחן.png', data: bytes('x') }]));
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
  });

  it('ארכיון ריק תקין', async () => {
    const view = await read(buildZip([]));
    expect(view.byteLength).toBe(22);
    expect(view.getUint32(0, true)).toBe(0x06054b50);
  });
});
