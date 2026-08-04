/**
 * בדיקת ייצוא מקצה לקצה: מפעיל כיתוב ולוגו, ומוודא שכל פורמט מפיק קובץ תקין
 * עם שם קובץ נכון.
 *
 * דורש שרת תצוגה פעיל (npm run build && npm run preview).
 *
 *   node scripts/export-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:4173';
const OUT = process.env.OUT_DIR ?? tmpdir();

const MAGIC = {
  png: 'PNG',
  svg: '<svg',
  pdf: '%PDF',
  jpg: '\xff\xd8\xff',
};

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));

await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.fill('#content-url', 'https://example.co.il/menu');
await page.waitForTimeout(800);

// כיתוב + לוגו, דרך גיליון "לוגו וכיתוב"
await page.getByRole('button', { name: /לוגו וכיתוב/ }).click();
await page.waitForTimeout(500);
await page.getByRole('switch', { name: 'הוספת כיתוב' }).click();
await page.setInputFiles('input[type=file]', {
  name: 'logo.png',
  mimeType: 'image/png',
  buffer: readFileSync('public/icons/icon-192.png'),
});
await page.waitForTimeout(700);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

let failures = 0;

for (const [format, ext] of [
  ['PNG', 'png'],
  ['SVG', 'svg'],
  ['PDF', 'pdf'],
  ['JPG', 'jpg'],
]) {
  await page.getByRole('button', { name: 'הורדה', exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByRole('radio', { name: format, exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('dialog').getByRole('button', { name: 'הורדה' }).click(),
  ]);
  await page.waitForTimeout(600);

  const path = join(OUT, `qr-export-test.${ext}`);
  await download.saveAs(path);
  const buffer = readFileSync(path);
  const head = buffer.subarray(0, 8).toString('latin1');
  const name = download.suggestedFilename();

  const validMagic = head.includes(MAGIC[ext]);
  const validName = name.endsWith(`.${ext}`) && /^[\x20-\x7E]+$/.test(name);
  const ok = validMagic && validName && buffer.length > 1000;
  if (!ok) failures++;

  console.log(
    `${ok ? '✓' : '✗'} ${format.padEnd(4)} ${name.padEnd(42)} ${String(buffer.length).padStart(8)} bytes` +
      (ok ? '' : `   magic=${validMagic} name=${validName}`),
  );
}

// גודל לא-ריבועי: הקוד צריך להתמרכז על קנבס 9:16 בלי לחתוך
await page.getByRole('button', { name: /^גודל/ }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /סטורי \/ ריל/ }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'הורדה', exact: true }).click();
await page.waitForTimeout(500);
await page.getByRole('radio', { name: 'PNG', exact: true }).click();
// שם קובץ מותאם אישית — הפיצ'ר שנוסף יחד עם הגיליון
await page.getByLabel('שם הקובץ').fill('my-story-code');
const [story] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.getByRole('dialog').getByRole('button', { name: 'הורדה' }).click(),
]);
const storyPath = join(OUT, 'qr-export-test-story.png');
await story.saveAs(storyPath);
const storySize = readFileSync(storyPath).length;
const storyName = story.suggestedFilename();
const storyOk = storySize > 1000 && storyName === 'my-story-code.png';
if (!storyOk) failures++;
console.log(
  `${storyOk ? '✓' : '✗'} סטורי 1080×1920 ${storyName.padEnd(24)} ${String(storySize).padStart(8)} bytes`,
);

console.log(failures ? `\n${failures} failed` : '\nall exports valid');
await browser.close();
process.exit(failures ? 1 : 0);
