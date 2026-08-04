/**
 * כותב ZIP מינימלי.
 *
 * ייצור באצווה מייצר עשרות קבצים, ואי אפשר להפעיל עשרות הורדות נפרדות —
 * הדפדפן חוסם את זה, והמשתמש נשאר עם תיקיית הורדות מבולגנת. ארכיון אחד פותר
 * את שניהם, ובלי ספרייה חיצונית: המבנה הוא כותרת לכל קובץ, טבלה מרכזית בסוף,
 * ורשומת סיום שמצביעה עליה.
 *
 * הקבצים נשמרים ללא דחיסה (method 0). זו לא התרשלות — PNG כבר דחוס, והפעלת
 * deflate עליו מוסיפה זמן ומגדילה מעט את התוצאה.
 */

export interface ZipEntry {
  /** שם בתוך הארכיון. תווים שאינם ASCII אפשריים אך עדיף לתעתק לפני. */
  name: string;
  data: Uint8Array;
}

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** זמן ותאריך בפורמט DOS — שני שדות של 16 סיביות שנשארו מ-1980. */
function dosStamp(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

class ByteWriter {
  private chunks: Uint8Array[] = [];
  private size = 0;

  get offset(): number {
    return this.size;
  }

  bytes(value: Uint8Array): void {
    this.chunks.push(value);
    this.size += value.length;
  }

  /** מספרים ב-ZIP נכתבים תמיד little-endian */
  u16(value: number): void {
    this.bytes(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.bytes(
      new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]),
    );
  }

  toBlob(type: string): Blob {
    return new Blob(this.chunks as BlobPart[], { type });
  }
}

const UTF8_FLAG = 0x0800;

export function buildZip(entries: ZipEntry[], now = new Date()): Blob {
  const writer = new ByteWriter();
  const stamp = dosStamp(now);
  const encoder = new TextEncoder();

  const records = entries.map((entry) => {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const offset = writer.offset;

    writer.u32(0x04034b50); // כותרת מקומית
    writer.u16(20); // גרסה נדרשת
    writer.u16(UTF8_FLAG);
    writer.u16(0); // ללא דחיסה
    writer.u16(stamp.time);
    writer.u16(stamp.date);
    writer.u32(crc);
    writer.u32(entry.data.length); // גודל דחוס
    writer.u32(entry.data.length); // גודל מקורי
    writer.u16(name.length);
    writer.u16(0); // ללא שדה נוסף
    writer.bytes(name);
    writer.bytes(entry.data);

    return { name, crc, size: entry.data.length, offset };
  });

  const centralStart = writer.offset;
  for (const record of records) {
    writer.u32(0x02014b50); // רשומה בטבלה המרכזית
    writer.u16(20); // נכתב בגרסה
    writer.u16(20); // גרסה נדרשת
    writer.u16(UTF8_FLAG);
    writer.u16(0);
    writer.u16(stamp.time);
    writer.u16(stamp.date);
    writer.u32(record.crc);
    writer.u32(record.size);
    writer.u32(record.size);
    writer.u16(record.name.length);
    writer.u16(0); // שדה נוסף
    writer.u16(0); // הערה
    writer.u16(0); // מספר דיסק
    writer.u16(0); // מאפיינים פנימיים
    writer.u32(0); // מאפיינים חיצוניים
    writer.u32(record.offset);
    writer.bytes(record.name);
  }
  const centralSize = writer.offset - centralStart;

  writer.u32(0x06054b50); // סוף הטבלה המרכזית
  writer.u16(0); // מספר הדיסק
  writer.u16(0); // הדיסק שבו מתחילה הטבלה
  writer.u16(records.length);
  writer.u16(records.length);
  writer.u32(centralSize);
  writer.u32(centralStart);
  writer.u16(0); // הערת ארכיון

  return writer.toBlob('application/zip');
}
