import { toAsciiFilename } from '../export';
import { buildPdf, encodeImage, type PdfPage, type PdfPlacement } from '../pdf';
import { renderToCanvas } from '../qr/render/canvas';
import type { QrGeometry } from '../qr/types';
import { buildZip, type ZipEntry } from '../zip';
import type { BatchRow } from './csv';
import { A4, cellPixels, layoutSheet, type SheetPreset } from './sheet';

/**
 * ייצור באצווה.
 *
 * כל פריט עובר את אותו צינור של קוד בודד — אותה גאומטריה, אותו רנדרר — ולכן
 * מה שיוצא באצווה זהה לחלוטין למה שנראה בתצוגה המקדימה. שורה שנכשלת (טקסט ארוך
 * מדי לרמת תיקון השגיאות, למשל) לא מפילה את כל הריצה: היא נאספת ומדווחת, כי
 * מבחינת המשתמש עדיף לקבל 48 מדבקות ורשימת שתיים שנכשלו מאשר כלום.
 */

export interface BatchFailure {
  index: number;
  row: BatchRow;
  reason: string;
}

export interface BatchInput {
  rows: BatchRow[];
  /** בונה גאומטריה עם הגדרות העיצוב הנוכחיות; זורק כשהערך לא ניתן לקידוד */
  build: (row: BatchRow) => QrGeometry;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface BatchResult {
  blob: Blob;
  filename: string;
  failures: BatchFailure[];
  /** כמה פריטים הופקו בפועל */
  produced: number;
}

/** מוותר על התור כדי שסרגל ההתקדמות יתעדכן ושהמסך לא ייתקע. */
const yieldToUi = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function assertLive(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('בוטל', 'AbortError');
}

/** שם קובץ ייחודי: מספר סידורי מוביל מונע דריסה בין שתי שורות עם אותו כיתוב. */
function entryName(row: BatchRow, index: number, total: number, extension: string): string {
  const width = String(total).length;
  const slug = toAsciiFilename(row.label || row.value.replace(/^https?:\/\//i, '')) || 'code';
  return `${String(index + 1).padStart(width, '0')}-${slug.slice(0, 48)}.${extension}`;
}

async function canvasBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('יצירת התמונה נכשלה');
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * מריץ את כל השורות ומחזיר קנבס לכל אחת שהצליחה.
 *
 * מרוכז כאן ולא בכל יעד ייצוא בנפרד, כי הרינדור הוא החלק היקר והוא זהה —
 * ההבדל בין ZIP לגיליון הוא רק מה עושים עם התוצאה.
 */
async function renderAll(
  input: BatchInput,
  pixelSize: number,
): Promise<{ items: Array<{ index: number; row: BatchRow; canvas: HTMLCanvasElement }>; failures: BatchFailure[] }> {
  const items: Array<{ index: number; row: BatchRow; canvas: HTMLCanvasElement }> = [];
  const failures: BatchFailure[] = [];

  for (const [index, row] of input.rows.entries()) {
    assertLive(input.signal);
    try {
      const geo = input.build(row);
      const canvas = await renderToCanvas(geo, {
        width: pixelSize,
        height: Math.round(pixelSize * (geo.boardHeight / geo.boardSize)),
        padColor: null,
      });
      items.push({ index, row, canvas });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      failures.push({
        index,
        row,
        reason: error instanceof Error ? error.message : 'הקוד לא נוצר',
      });
    }
    input.onProgress?.(index + 1, input.rows.length);
    await yieldToUi();
  }

  return { items, failures };
}

/** ארכיון של קובצי PNG — קובץ אחד לכל שורה. */
export async function buildBatchZip(input: BatchInput, pixelSize: number): Promise<BatchResult> {
  const { items, failures } = await renderAll(input, pixelSize);

  const entries: ZipEntry[] = [];
  for (const item of items) {
    assertLive(input.signal);
    entries.push({
      name: entryName(item.row, item.index, input.rows.length, 'png'),
      data: await canvasBytes(item.canvas),
    });
  }

  return {
    blob: buildZip(entries),
    filename: `qr-batch-${entries.length}.zip`,
    failures,
    produced: entries.length,
  };
}

/** גיליונות A4 מוכנים להדפסה, עם קווי חיתוך אופציונליים. */
export async function buildBatchSheet(
  input: BatchInput,
  preset: SheetPreset,
  guides: boolean,
): Promise<BatchResult> {
  const probe = layoutSheet(preset);
  const { items, failures } = await renderAll(input, cellPixels(probe.cellWidthMm));

  if (items.length === 0) {
    throw new Error('אף קוד לא נוצר — בדקו את הרשימה');
  }

  // היחס נקבע מהקוד הראשון: כל הפריטים חולקים עיצוב, ולכן גם מידות לוח
  const first = items[0].canvas;
  const layout = layoutSheet(preset, first.height / first.width);

  const pages: PdfPage[] = [];
  for (let start = 0; start < items.length; start += layout.perPage) {
    assertLive(input.signal);
    const slice = items.slice(start, start + layout.perPage);
    const placements: PdfPlacement[] = [];

    for (const [position, item] of slice.entries()) {
      const cell = layout.cells[position];
      const image = await encodeImage(item.canvas);
      placements.push({
        ...cell,
        image: {
          ...image,
          pixelWidth: item.canvas.width,
          pixelHeight: item.canvas.height,
        },
      });
    }

    pages.push({
      items: placements,
      // רק תאים מלאים: מסגרות ריקות בעמוד האחרון נראות כמו תקלה, ולא מוסיפות
      // דבר — כל גזירה ממילא זהה
      guides: guides ? layout.cells.slice(0, slice.length) : undefined,
    });
    await yieldToUi();
  }

  return {
    blob: buildPdf(pages, { ...A4, title: `גיליון קודי QR — ${items.length} קודים` }),
    filename: `qr-sheet-${items.length}.pdf`,
    failures,
    produced: items.length,
  };
}
