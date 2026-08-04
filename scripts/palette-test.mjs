/**
 * בדיקת חילוץ פלטה מלוגו.
 *
 * הטענה המרכזית: התוצאה היא *צבעי המותג*, לא "הצבעים בתמונה". כלומר לבן,
 * שחור ואפור — שקיימים כמעט בכל לוגו — לא אמורים להופיע, וכל צבע שמוחזר
 * חייב לעבור את סף הניגודיות מול הרקע שאיתו הוא יוצג.
 *
 * דורש שרת פיתוח פעיל (npm run dev) על פורט 5174.
 *
 *   node scripts/palette-test.mjs
 */
import { launchBrowser } from './browser.mjs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5174';

const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });

const results = await page.evaluate(async () => {
  const { extractPalette } = await import('/src/lib/logo/palette.ts');
  const { contrastRatio } = await import('/src/lib/contrast.ts');

  /** מצייר לוגו סינתטי: רקע לבן, שטח אפור גדול, ושני צבעי מותג. */
  const makeLogo = (colors) => {
    const c = document.createElement('canvas');
    c.width = c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, 200, 200);
    x.fillStyle = '#9CA3AF'; // אפור — שטח גדול שאסור שייבחר
    x.fillRect(0, 0, 200, 70);
    colors.forEach((color, i) => {
      x.fillStyle = color;
      x.fillRect(0, 70 + i * 40, 200, 40);
    });
    return c.toDataURL('image/png');
  };

  const out = [];

  const brand = await extractPalette(makeLogo(['#1D4ED8', '#DC2626']), { background: '#FFFFFF' });
  out.push({
    name: 'שני צבעי מותג',
    colors: brand,
    noNeutrals: !brand.some((c) => ['#FFFFFF', '#000000', '#9CA3AF'].includes(c)),
    allReadable: brand.every((c) => contrastRatio(c, '#FFFFFF') >= 4.5),
  });

  // צהוב בהיר: אסור שייפסל, אלא יוכהה עד שהוא קריא
  const bright = await extractPalette(makeLogo(['#FDE047']), { background: '#FFFFFF' });
  out.push({
    name: 'צהוב בהיר',
    colors: bright,
    noNeutrals: bright.length > 0,
    allReadable: bright.every((c) => contrastRatio(c, '#FFFFFF') >= 4.5),
  });

  // תמונה אפורה לגמרי — אין צבעי מותג להציע
  const grayOnly = await extractPalette(makeLogo(['#6B7280']), { background: '#FFFFFF' });
  out.push({
    name: 'אפור בלבד',
    colors: grayOnly,
    noNeutrals: grayOnly.length === 0,
    allReadable: true,
  });

  // רקע כהה — הצבעים חייבים לעבוד מולו
  const onDark = await extractPalette(makeLogo(['#1D4ED8', '#DC2626']), { background: '#0B1120' });
  out.push({
    name: 'מול רקע כהה',
    colors: onDark,
    noNeutrals: true,
    allReadable: onDark.every((c) => contrastRatio(c, '#0B1120') >= 4.5),
  });

  return out;
});

let failures = 0;
for (const r of results) {
  const ok = r.noNeutrals && r.allReadable;
  if (!ok) failures++;
  console.log(
    `${ok ? '✓' : '✗'} ${r.name.padEnd(16)} ${(r.colors.join(' ') || '—').padEnd(34)}` +
      (ok ? '' : ` neutrals=${r.noNeutrals} readable=${r.allReadable}`),
  );
}

console.log(failures ? `\n${failures} failed` : '\npalette extraction ok');
await browser.close();
process.exit(failures ? 1 : 0);
