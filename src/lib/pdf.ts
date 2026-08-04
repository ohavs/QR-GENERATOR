/**
 * כותב PDF מינימלי לתמונה בודדת בעמוד אחד.
 *
 * למה לא ספרייה: ספריות ה-PDF הנפוצות גוררות איתן html2canvas ו-DOMPurify
 * (מעל 600KB) בשביל יכולות שאנחנו לא משתמשים בהן. כאן צריך בדיוק דבר אחד —
 * להטביע תמונה אחת בעמוד בגודל פיזי מדויק — וזה כמה עשרות שורות.
 *
 * ברירת המחדל היא FlateDecode על פיקסלים גולמיים, כלומר ללא אובדן: לקוד QR
 * זה קריטי, כי ארטיפקטים של JPEG סביב קצוות חדים פוגעים בסריקה בגדלים קטנים.
 */

const PT_PER_MM = 72 / 25.4;

class PdfBuffer {
  private chunks: Uint8Array[] = [];
  private length = 0;

  /** מוסיף טקסט ASCII/Latin-1 */
  text(value: string): void {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
    this.raw(bytes);
  }

  raw(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  get offset(): number {
    return this.length;
  }

  toBlob(): Blob {
    return new Blob(this.chunks as BlobPart[], { type: 'application/pdf' });
  }
}

async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * מקודד מחרוזת למחרוזת PDF.
 *
 * מחרוזת בסוגריים ב-PDF היא PDFDocEncoding (בייט אחד לתו), ולכן עברית בה
 * יוצאת ג'יבריש. הדרך התקנית לתווים שאינם לטיניים היא מחרוזת הקסדצימלית
 * ב-UTF-16BE עם BOM.
 */
function pdfString(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) {
    return `(${value.replace(/[\\()]/g, (c) => `\\${c}`)})`;
  }
  let hex = 'FEFF';
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0').toUpperCase();
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += code.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return `<${hex}>`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface ImagePayload {
  bytes: Uint8Array;
  filter: 'FlateDecode' | 'DCTDecode';
}

/** מכין את גוף התמונה: ללא אובדן אם הדפדפן תומך בדחיסה, אחרת JPEG באיכות גבוהה. */
async function encodeImage(canvas: HTMLCanvasElement): Promise<ImagePayload> {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgb = new Uint8Array((data.length / 4) * 3);
    for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
      // שיטוח על לבן — ב-PDF אין ערוץ שקיפות בזרם הבסיסי
      const alpha = data[i + 3] / 255;
      rgb[j] = Math.round(data[i] * alpha + 255 * (1 - alpha));
      rgb[j + 1] = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
      rgb[j + 2] = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
    }
    const compressed = await deflate(rgb);
    if (compressed) return { bytes: compressed, filter: 'FlateDecode' };
  }
  return { bytes: dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.96)), filter: 'DCTDecode' };
}

export interface PdfOptions {
  /** רוחב העמוד במילימטרים */
  widthMm: number;
  /** גובה העמוד במילימטרים */
  heightMm: number;
  title?: string;
}

export interface PdfImage {
  bytes: Uint8Array;
  filter: 'FlateDecode' | 'DCTDecode';
  pixelWidth: number;
  pixelHeight: number;
}

/**
 * מרכיב את מסמך ה-PDF מתמונה מקודדת.
 *
 * מופרד מ-`canvasToPdf` כדי שאפשר יהיה לבדוק את הרכבת המסמך — במיוחד את טבלת
 * ה-xref, שבה כל היסט חייב להצביע בדיוק על תחילת האובייקט — בלי דפדפן.
 */
export function buildPdfDocument(image: PdfImage, options: PdfOptions): Blob {
  const { bytes: imageBytes, filter } = image;
  const canvas = { width: image.pixelWidth, height: image.pixelHeight };
  const pageW = +(options.widthMm * PT_PER_MM).toFixed(3);
  const pageH = +(options.heightMm * PT_PER_MM).toFixed(3);

  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`;
  const title = pdfString(options.title ?? 'QR Code');

  const objects: Array<{ head: string; stream?: Uint8Array }> = [
    { head: '<< /Type /Catalog /Pages 2 0 R >>' },
    { head: '<< /Type /Pages /Kids [3 0 R] /Count 1 >>' },
    {
      head:
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        '/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>',
    },
    {
      head:
        '<< /Type /XObject /Subtype /Image ' +
        `/Width ${canvas.width} /Height ${canvas.height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${filter} ` +
        `/Length ${imageBytes.length} >>`,
      stream: imageBytes,
    },
    {
      head: `<< /Length ${content.length} >>`,
      stream: new TextEncoder().encode(content),
    },
    { head: `<< /Producer (QR Studio) /Title ${title} /Creator (QR Studio) >>` },
  ];

  const pdf = new PdfBuffer();
  pdf.text('%PDF-1.4\n');
  // תגובת בייטים בינאריים — מסמנת לקוראים שהקובץ אינו טקסט טהור
  pdf.raw(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.offset);
    pdf.text(`${i + 1} 0 obj\n${obj.head}\n`);
    if (obj.stream) {
      pdf.text('stream\n');
      pdf.raw(obj.stream);
      pdf.text('\nendstream\n');
    }
    pdf.text('endobj\n');
  });

  const xrefOffset = pdf.offset;
  pdf.text(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets) {
    pdf.text(`${String(offset).padStart(10, '0')} 00000 n \n`);
  }
  pdf.text(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return pdf.toBlob();
}

/** בונה PDF בן עמוד אחד שבו התמונה ממלאת את כל שטח העמוד. */
export async function canvasToPdf(canvas: HTMLCanvasElement, options: PdfOptions): Promise<Blob> {
  const { bytes, filter } = await encodeImage(canvas);
  return buildPdfDocument(
    { bytes, filter, pixelWidth: canvas.width, pixelHeight: canvas.height },
    options,
  );
}

export { PT_PER_MM, pdfString };
