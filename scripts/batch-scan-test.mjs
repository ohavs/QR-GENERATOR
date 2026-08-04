/**
 * בדיקת סריקוּת לגיליון המדבקות.
 *
 * הסיכון האמיתי בייצור באצווה הוא שהמשתמש יבחר "40 בעמוד", ידפיס מאה גיליונות,
 * ורק אז יגלה שאף טלפון לא קורא אותם. לכן כל צפיפות שאנחנו מציעים נבדקת כאן
 * ברזולוציה שמצלמה באמת קולטת ממדבקה בגודל הזה, ולא ברזולוציית הייצוא.
 *
 * דורש שרת פיתוח פעיל (npm run dev).
 *
 *   node scripts/batch-scan-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5174';

/** כתובת קצרה וכתובת ארוכה — אורך הכתובת קובע את מספר המודולים, ולכן את הסף. */
const VALUES = {
  קצרה: 'https://qr.im/a7x',
  ארוכה: 'https://example.co.il/menu/table?id=42&utm_source=sticker&utm_campaign=summer',
};

/**
 * כמה פיקסלים מצלמה קולטת ממדבקה בגודל נתון.
 *
 * טלפון מודרני מצלם כ-12 מגה-פיקסל, אבל הסורק עובד על תצוגה מוקטנת ובפריים
 * שמכיל גם את הסביבה. הערכה שמרנית: כ-8 פיקסלים למילימטר כשהמדבקה ממלאת
 * חלק סביר מהפריים.
 */
const cameraPixels = (widthMm) => Math.round(widthMm * 8);

const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
await page.goto(ORIGIN, { waitUntil: 'load' });
// המתנה קצרה: רישום ה-service worker בעליית העמוד עלול לרענן אותו, ורענון
// באמצע ה-evaluate מפיל את ההקשר
await page.waitForTimeout(1500);
await page.addScriptTag({ content: readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8') });

const results = await page.evaluate(async ({ values }) => {
  const { buildGeometry, frameHeight } = await import('/src/lib/qr/geometry.ts');
  const { renderToCanvas } = await import('/src/lib/qr/render/canvas.ts');
  const { DEFAULT_DESIGN } = await import('/src/lib/qr/presets.ts');
  const { layoutSheet, SHEET_PRESETS, moduleMillimeters } = await import('/src/lib/batch/sheet.ts');

  const out = [];
  for (const [name, value] of Object.entries(values)) {
    const probe = buildGeometry({
      value,
      design: DEFAULT_DESIGN,
      transparentBackground: false,
      quietZone: 4,
      ecLevel: DEFAULT_DESIGN.ecLevel,
      logo: null,
      frame: { enabled: true, text: 'שולחן 1' },
    });

    const ratio = (probe.boardSize + frameHeight(probe.boardSize)) / probe.boardSize;

    for (const preset of SHEET_PRESETS) {
      const layout = layoutSheet(preset, ratio);
      const width = Math.round(layout.cellWidthMm * 8);
      const canvas = await renderToCanvas(probe, {
        width,
        height: Math.round(width * ratio),
        padColor: '#FFFFFF',
      });
      const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const decoded = window.jsQR(image.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });

      out.push({
        preset: preset.id,
        label: preset.label,
        value: name,
        cellMm: +layout.cellWidthMm.toFixed(1),
        moduleMm: +moduleMillimeters(layout.cellWidthMm, probe.boardSize).toFixed(2),
        ok: decoded?.data === value,
      });
    }
  }
  return out;
}, { values: VALUES });

await browser.close();

console.log('צפיפות        כתובת   מדבקה   מודול   סריקה');
let failures = 0;
for (const r of results) {
  if (!r.ok) failures++;
  console.log(
    `${r.label.padEnd(12)} ${r.value.padEnd(7)} ${String(r.cellMm).padStart(5)}מ״מ ` +
      `${String(r.moduleMm).padStart(5)}מ״מ   ${r.ok ? '✓' : '✗'}`,
  );
}

// הכישלונות הצפויים הם בדיוק אלה שהממשק מזהיר עליהם מראש. שער הבדיקה הוא
// ההתאמה בין השניים: אזהרה שמופיעה כשהכול תקין היא רעש, ואזהרה שחסרה כשהקוד
// לא נקרא היא הבטחה שקרית.
const MIN_MODULE_MM = 0.5;
const surprises = results.filter((r) => !r.ok && r.moduleMm >= MIN_MODULE_MM);

console.log(`\n${results.length - failures}/${results.length} נסרקו`);
if (surprises.length) {
  console.log(`✗ ${surprises.length} נכשלו בלי שהאזהרה הופיעה: ${surprises.map((s) => s.preset).join(', ')}`);
}
process.exit(surprises.length ? 1 : 0);
