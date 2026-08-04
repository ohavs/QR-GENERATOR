import { describe, expect, it } from 'vitest';
import { buildPdfDocument, pdfString, PT_PER_MM } from './pdf';

/**
 * ה-PDF נכתב ביד, ולכן טבלת ה-xref היא הנקודה השברירית: כל היסט חייב להצביע
 * בדיוק על הבייט שבו מתחיל האובייקט. שגיאה של בייט אחד מייצרת קובץ שחלק
 * מהקוראים פותחים וחלק לא — בדיוק סוג התקלה שלא מתגלה בעין.
 */

const IMAGE = {
  bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  filter: 'FlateDecode' as const,
  pixelWidth: 2,
  pixelHeight: 2,
};

async function render(title = 'QR'): Promise<string> {
  const blob = buildPdfDocument(IMAGE, { widthMm: 100, heightMm: 50, title });
  const buffer = await blob.arrayBuffer();
  return new TextDecoder('latin1').decode(buffer);
}

describe('buildPdfDocument', () => {
  it('כותב כותרת PDF ותגובת בייטים בינאריים', async () => {
    const pdf = await render();
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.slice(9, 14)).toBe('%\xe2\xe3\xcf\xd3');
  });

  it('כל היסט ב-xref מצביע בדיוק על תחילת האובייקט', async () => {
    const pdf = await render();

    // 'startxref' מכיל 'xref', ולכן חיפוש נאיבי תופס את המחרוזת הלא נכונה
    const xrefStart = pdf.indexOf('\nxref\n');
    const entries = pdf
      .slice(xrefStart)
      .split('\n')
      .filter((line) => /^\d{10} \d{5} [nf] $/.test(line));

    // אובייקט 0 החופשי + שישה אובייקטים אמיתיים
    expect(entries).toHaveLength(7);

    entries.slice(1).forEach((entry, index) => {
      const offset = Number.parseInt(entry.slice(0, 10), 10);
      expect(pdf.slice(offset)).toMatch(new RegExp(`^${index + 1} 0 obj\\n`));
    });
  });

  it('startxref מצביע על טבלת ה-xref', async () => {
    const pdf = await render();
    const declared = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(declared, declared + 5)).toBe('xref\n');
  });

  it('גודל הטריילר תואם למספר האובייקטים בפועל', async () => {
    const pdf = await render();
    const size = Number(/\/Size (\d+)/.exec(pdf)?.[1]);
    const objects = [...pdf.matchAll(/^\d+ 0 obj$/gm)].length;
    expect(size).toBe(objects + 1); // +1 עבור האובייקט החופשי
  });

  it('ממיר מילימטרים לנקודות ב-MediaBox', async () => {
    const pdf = await render();
    const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf);
    expect(Number(box?.[1])).toBeCloseTo(100 * PT_PER_MM, 2);
    expect(Number(box?.[2])).toBeCloseTo(50 * PT_PER_MM, 2);
  });

  it('אורך הזרם תואם למספר הבייטים שנכתבו', async () => {
    const pdf = await render();
    const declared = Number(/\/Filter \/FlateDecode \/Length (\d+)/.exec(pdf)?.[1]);
    expect(declared).toBe(IMAGE.bytes.length);
  });
});

describe('pdfString', () => {
  it('משאיר ASCII כמחרוזת בסוגריים', () => {
    expect(pdfString('QR Code')).toBe('(QR Code)');
  });

  it('מבריח סוגריים ולוכסן אחורי', () => {
    expect(pdfString('a(b)c\\d')).toBe('(a\\(b\\)c\\\\d)');
  });

  it('מקודד עברית כ-UTF-16BE עם BOM', () => {
    // ג'יבריש בכותרת ה-PDF נוצר בדיוק מכתיבת עברית כמחרוזת בסוגריים
    const encoded = pdfString('קוד');
    expect(encoded).toBe('<FEFF05E705D505D3>');
  });

  it('מקודד תווים מחוץ למישור הבסיסי כזוג surrogate', () => {
    expect(pdfString('😀')).toBe('<FEFFD83DDE00>');
  });
});
