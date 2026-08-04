import { renderToCanvas } from './qr/render/canvas';
import { toSvg } from './qr/render/svg';
import { paintToColor } from './qr/render/common';
import type { QrGeometry } from './qr/types';
import type { SizePreset } from './sizes';

export type ExportFormat = 'png' | 'svg' | 'pdf' | 'jpeg';

export interface ExportRequest {
  geo: QrGeometry;
  size: SizePreset;
  format: ExportFormat;
  /** שם הקובץ ללא סיומת (ASCII) */
  name: string;
  /** כותרת קריאה לבני אדם — נכנסת ל-<title> ב-SVG ולמטא-דאטה של ה-PDF */
  title: string;
  /** true = רקע שקוף (רק PNG/SVG). ב-JPEG/PDF תמיד יימלא לבן. */
  transparent: boolean;
}

const MAX_CANVAS_PX = 8192;

/** ממדי היעד בפיקסלים, כולל התאמה ליחס הלוח כשלא הוגדר גובה מפורש. */
export function targetPixels(geo: QrGeometry, size: SizePreset): { width: number; height: number } {
  const ratio = geo.boardHeight / geo.boardSize;
  const width = Math.min(size.width, MAX_CANVAS_PX);
  const height = Math.min(size.height ?? Math.round(size.width * ratio), MAX_CANVAS_PX);
  return { width, height };
}

/** צבע השוליים כשיחס היעד שונה מיחס הלוח — נלקח מרקע העיצוב כדי שלא ייווצר "פס". */
function padColorFor(geo: QrGeometry, transparent: boolean): string | null {
  if (transparent) return null;
  return geo.background ? paintToColor(geo.background.paint) : '#FFFFFF';
}

export async function toPngBlob(
  geo: QrGeometry,
  size: SizePreset,
  transparent: boolean,
  type: 'image/png' | 'image/jpeg' = 'image/png',
): Promise<Blob> {
  const { width, height } = targetPixels(geo, size);
  const canvas = await renderToCanvas(geo, {
    width,
    height,
    padColor: type === 'image/jpeg' ? (padColorFor(geo, false) ?? '#FFFFFF') : padColorFor(geo, transparent),
  });
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === 'image/jpeg' ? 0.94 : undefined),
  );
  if (!blob) throw new Error('יצירת התמונה נכשלה');
  return blob;
}

export function toSvgBlob(geo: QrGeometry, size: SizePreset, title: string): Blob {
  const markup = toSvg(geo, { pixelSize: size.width, title, idPrefix: `qr-${Date.now()}` });
  return new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
}

export async function toPdfBlob(geo: QrGeometry, size: SizePreset, title: string): Promise<Blob> {
  const { canvasToPdf } = await import('./pdf');

  // מידות פיזיות: אם אין מ"מ מוגדרים, מתרגמים את הפיקסלים לפי 300DPI
  const { width, height } = targetPixels(geo, size);
  const widthMm = size.mm ? size.mm[0] : (width / 300) * 25.4;
  const heightMm = size.mm ? size.mm[1] : (height / 300) * 25.4;

  // תמיד מרנדרים ב-300DPI לפחות, כדי שההדפסה תצא חדה
  const renderW = Math.min(MAX_CANVAS_PX, Math.max(width, Math.round((widthMm / 25.4) * 300)));
  const renderH = Math.min(MAX_CANVAS_PX, Math.round(renderW * (heightMm / widthMm)));

  const canvas = await renderToCanvas(geo, {
    width: renderW,
    height: renderH,
    padColor: padColorFor(geo, false) ?? '#FFFFFF',
  });

  return canvasToPdf(canvas, { widthMm, heightMm, title });
}

export async function buildExport(req: ExportRequest): Promise<{ blob: Blob; filename: string }> {
  const { geo, size, format, name, title, transparent } = req;
  switch (format) {
    case 'png':
      return { blob: await toPngBlob(geo, size, transparent), filename: `${name}.png` };
    case 'jpeg':
      return { blob: await toPngBlob(geo, size, false, 'image/jpeg'), filename: `${name}.jpg` };
    case 'svg':
      return { blob: toSvgBlob(geo, size, title), filename: `${name}.svg` };
    case 'pdf':
      return { blob: await toPdfBlob(geo, size, title), filename: `${name}.pdf` };
  }
}

/** מוריד Blob כקובץ. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // שחרור מושהה — ספארי זקוק לכתובת חיה בזמן הלחיצה
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && !!navigator.share;
}

export type ShareResult = 'shared' | 'cancelled' | 'unsupported';

/** משתף קובץ דרך תפריט השיתוף המקורי של המכשיר. */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<ShareResult> {
  if (!canShareFiles()) return 'unsupported';
  const file = new File([blob], filename, { type: blob.type });
  if (!navigator.canShare({ files: [file] })) return 'unsupported';
  try {
    await navigator.share({ files: [file], title });
    return 'shared';
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/** מעתיק PNG ללוח. מוחזר false כשהדפדפן לא תומך. */
export async function copyPngToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * שם קובץ בטוח מתוך הערך שהמשתמש הזין.
 *
 * השם נשאר ASCII בכוונה: חלק מהדפדפנים ומערכות הקבצים משמיטים או משבשים שמות
 * עם תווים עבריים בהורדה, והמשתמש מקבל קובץ בשם "download". לכן משתמשים
 * במזהה האנגלי של העיצוב ולא בשמו המוצג.
 */
export function suggestFilename(value: string, designId: string): string {
  const slug = value
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `qr-${slug || 'code'}-${designId}`;
}
