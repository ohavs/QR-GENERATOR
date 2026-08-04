/**
 * כותב PDF מינימלי.
 *
 * למה לא ספרייה: ספריות ה-PDF הנפוצות גוררות איתן html2canvas ו-DOMPurify
 * (מעל 600KB) בשביל יכולות שאנחנו לא משתמשים בהן. כאן צריך בדיוק שני דברים —
 * להטביע תמונות בגודל פיזי מדויק, ולצייר קווי חיתוך — וזה כמה עשרות שורות.
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
export async function encodeImage(canvas: HTMLCanvasElement): Promise<ImagePayload> {
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

/** מלבן במילימטרים, עם ציר Y יורד מראש העמוד — כמו במסך, לא כמו ב-PDF. */
export interface PdfRect {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface PdfPlacement extends PdfRect {
  image: PdfImage;
}

export interface PdfPage {
  items: PdfPlacement[];
  /** מלבנים מקווקווים לחיתוך — עוזרים לגזור גיליון מדבקות בדיוק */
  guides?: PdfRect[];
}

interface PdfObject {
  head: string;
  stream?: Uint8Array;
}

/**
 * מ"מ לנקודות, מעוגל לשלוש ספרות.
 *
 * העיגול אינו קוסמטי: בלעדיו חיסור בין ערכים מומרים מייצר זנבות של נקודה
 * צפה ("700.1579999999999") שמנפחים את הקובץ בכל מיקום ומיקום.
 */
const pt = (mm: number): number => +(mm * PT_PER_MM).toFixed(3);

/** אותו עיגול, על ערך שכבר בנקודות */
const round = (value: number): number => +value.toFixed(3);

function imageObject(image: PdfImage): PdfObject {
  return {
    head:
      '<< /Type /XObject /Subtype /Image ' +
      `/Width ${image.pixelWidth} /Height ${image.pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${image.filter} ` +
      `/Length ${image.bytes.length} >>`,
    stream: image.bytes,
  };
}

/**
 * מרכיב מסמך PDF מרובה עמודים ותמונות.
 *
 * מופרד מהרינדור כדי שאפשר יהיה לבדוק את הרכבת המסמך — במיוחד את טבלת ה-xref,
 * שבה כל היסט חייב להצביע בדיוק על תחילת האובייקט — בלי דפדפן.
 *
 * מספור האובייקטים נקבע תוך כדי בנייה, ולכן שני האובייקטים הראשונים (הקטלוג
 * ועץ העמודים) שמורים מראש: העץ חייב להכיר את מספרי כל העמודים, שנודעים רק
 * בסוף, וכל עמוד חייב להצביע חזרה על העץ במספר קבוע.
 */
export function buildPdf(pages: PdfPage[], options: PdfOptions): Blob {
  const pageW = pt(options.widthMm);
  const pageH = pt(options.heightMm);

  const objects: PdfObject[] = [{ head: '' }, { head: '' }];
  const alloc = (obj: PdfObject): number => {
    objects.push(obj);
    return objects.length;
  };

  const pageNumbers = pages.map((page) => {
    const resources: string[] = [];
    let content = '';

    page.items.forEach((item, index) => {
      const name = `Im${index}`;
      resources.push(`/${name} ${alloc(imageObject(item.image))} 0 R`);
      const w = pt(item.widthMm);
      const h = pt(item.heightMm);
      // ציר ה-Y ב-PDF עולה מתחתית העמוד; הקלט יורד מראשו
      const y = round(pageH - pt(item.yMm) - h);
      content += `q ${w} 0 0 ${h} ${pt(item.xMm)} ${y} cm /${name} Do Q\n`;
    });

    if (page.guides?.length) {
      content += 'q 0.4 w 0.75 G [3 3] 0 d\n';
      for (const guide of page.guides) {
        const h = pt(guide.heightMm);
        content += `${pt(guide.xMm)} ${round(pageH - pt(guide.yMm) - h)} ${pt(guide.widthMm)} ${h} re S\n`;
      }
      content += 'Q\n';
    }

    const stream = new TextEncoder().encode(content);
    const contentNumber = alloc({ head: `<< /Length ${stream.length} >>`, stream });

    return alloc({
      head:
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
        `/Resources << /XObject << ${resources.join(' ')} >> /ProcSet [/PDF /ImageC] >> ` +
        `/Contents ${contentNumber} 0 R >>`,
    });
  });

  const title = pdfString(options.title ?? 'QR Code');
  const infoNumber = alloc({
    head: `<< /Producer (QR Studio) /Title ${title} /Creator (QR Studio) >>`,
  });

  objects[0] = { head: '<< /Type /Catalog /Pages 2 0 R >>' };
  objects[1] = {
    head:
      `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${n} 0 R`).join(' ')}] ` +
      `/Count ${pages.length} >>`,
  };

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
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoNumber} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return pdf.toBlob();
}

/** עמוד אחד שבו התמונה ממלאת את כל שטח העמוד. */
export function buildPdfDocument(image: PdfImage, options: PdfOptions): Blob {
  return buildPdf(
    [
      {
        items: [
          { image, xMm: 0, yMm: 0, widthMm: options.widthMm, heightMm: options.heightMm },
        ],
      },
    ],
    options,
  );
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
