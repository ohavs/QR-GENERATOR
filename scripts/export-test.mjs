import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';

const OUT = '/tmp/claude-0/-home-user-QR-GENERATOR/79cf2bd9-4472-5067-a53e-aec097108180/scratchpad';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));

await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.fill('#qr-value', 'https://example.co.il/menu');
await page.waitForTimeout(600);

// הפעלת כיתוב + לוגו
await page.getByRole('tab', { name: 'התאמה' }).click();
await page.waitForTimeout(300);
await page.getByRole('switch', { name: 'הוספת כיתוב' }).click();
await page.waitForTimeout(300);
await page.setInputFiles('input[type=file]', {
  name: 'logo.png',
  mimeType: 'image/png',
  buffer: readFileSync('public/icons/icon-192.png'),
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/07-caption-logo.png`, fullPage: true });

// ייצוא בכל הפורמטים
for (const [fmt, ext] of [['PNG', 'png'], ['SVG', 'svg'], ['PDF', 'pdf'], ['JPG', 'jpg']]) {
  await page.getByRole('tab', { name: fmt, exact: true }).click();
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: 'הורדה' }).click(),
  ]);
  const path = `${OUT}/out.${ext}`;
  await dl.saveAs(path);
  const buf = readFileSync(path);
  console.log(`${fmt.padEnd(4)} ${dl.suggestedFilename().padEnd(46)} ${String(buf.length).padStart(8)} bytes  head=${JSON.stringify(buf.subarray(0, 8).toString('latin1'))}`);
}

// ייצוא בגודל לא-ריבועי (סטורי)
await page.getByRole('tab', { name: 'גודל' }).click();
await page.getByRole('button', { name: 'סטורי / ריל 1080 ×' }).click();
await page.waitForTimeout(400);
await page.getByRole('tab', { name: 'PNG', exact: true }).click();
const [story] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  page.getByRole('button', { name: 'הורדה' }).click(),
]);
await story.saveAs(`${OUT}/out-story.png`);
console.log('story:', story.suggestedFilename(), readFileSync(`${OUT}/out-story.png`).length, 'bytes');

await browser.close();
