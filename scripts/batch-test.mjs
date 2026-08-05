/**
 * בדיקת ייצור באצווה מקצה לקצה.
 *
 * מה שנבדק כאן ולא ביחידה: שהצינור המלא — פירוק הרשימה, בניית גאומטריה לכל
 * שורה, רינדור על קנבס אמיתי, ואריזה ל-ZIP או ל-PDF — מפיק קובץ שאפשר לפתוח.
 * כותב ה-ZIP וכותב ה-PDF נכתבו ביד, ולכן "נוצר קובץ" אינו מספיק: הבדיקה
 * מפרקת את הפלט חזרה ומוודאת שמספר הרשומות והעמודים הוא מה שהתבקש.
 *
 * דורש שרת תצוגה פעיל (npm run build && npm run preview).
 *
 *   node scripts/batch-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:4173';
const OUT = process.env.OUT_DIR ?? tmpdir();

const ROWS = 7;
const LIST = Array.from(
  { length: ROWS },
  (_, i) => `https://example.co.il/table/${i + 1}, שולחן ${i + 1}`,
).join('\n');

/** סופר רשומות ב-ZIP דרך רשומת הסיום, כמו שקורא אמיתי היה עושה. */
function zipEntryCount(buffer) {
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return buffer.readUInt16LE(i + 10);
  }
  throw new Error('לא נמצאה רשומת סיום ZIP');
}

function pdfPageCount(buffer) {
  const text = buffer.toString('latin1');
  return [...text.matchAll(/\/Type \/Page[^s]/g)].length;
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));

await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.fill('#content-url', 'https://example.co.il');
await page.waitForTimeout(600);

await page.getByRole('button', { name: 'אצווה' }).click();
await page.waitForTimeout(500);
await page.getByRole('textbox').last().fill(LIST);
await page.waitForTimeout(400);

let failures = 0;

const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${actual}${ok ? '' : ` (ציפינו ל-${expected})`}`);
};

// ── גיליון A4 ────────────────────────────────────────────────
{
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByRole('dialog').getByRole('button', { name: /הורדת (גיליון A4|\d+ עמודי A4)/ }).click(),
  ]);
  const path = join(OUT, download.suggestedFilename());
  await download.saveAs(path);
  const buffer = readFileSync(path);

  check('הגיליון הוא PDF', buffer.subarray(0, 4).toString(), '%PDF');
  check('עמוד אחד לשבעה קודים ברשת 3×4', pdfPageCount(buffer), 1);
  console.log(`  ${download.suggestedFilename()} · ${(buffer.length / 1024).toFixed(0)}KB`);
}

// ── ארכיון PNG ───────────────────────────────────────────────
{
  await page.getByRole('radio', { name: 'קבצים נפרדים' }).click();
  await page.waitForTimeout(400);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByRole('dialog').getByRole('button', { name: /הורדת \d+ קבצים בארכיון/ }).click(),
  ]);
  const path = join(OUT, download.suggestedFilename());
  await download.saveAs(path);
  const buffer = readFileSync(path);

  check('הארכיון הוא ZIP', buffer.readUInt32LE(0), 0x04034b50);
  check('קובץ לכל שורה', zipEntryCount(buffer), ROWS);
  console.log(`  ${download.suggestedFilename()} · ${(buffer.length / 1024).toFixed(0)}KB`);
}

await browser.close();

console.log(failures === 0 ? '\nהכול תקין' : `\n${failures} כשלים`);
process.exit(failures === 0 ? 0 : 1);
