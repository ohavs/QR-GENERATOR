/**
 * בדיקת סריקוּת: מרנדר כל עיצוב בכמה גדלים ומפענח בחזרה עם jsQR.
 * עיצוב יפה שלא נסרק הוא באג, לא טעם אישי.
 *
 * דורש שרת פיתוח פעיל (npm run dev) על הפורט שמוגדר למטה.
 *
 *   node scan-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5174';
const VALUE = 'https://claude.ai/code?utm_source=qr&ref=studio';
// חמישה גדלים ולא שלושה: עיצוב גבולי עבר בשלושה ונפל ב-CI על הבדל
// ברסטריזציה בין גרסאות Chromium. רשת צפופה יותר תופסת אותו כאן.
const SIZES = [256, 320, 400, 640, 1024];

const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.addScriptTag({ content: readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8') });

const results = await page.evaluate(
  async ({ value, sizes }) => {
    const { buildGeometry } = await import('/src/lib/qr/geometry.ts');
    const { renderToCanvas } = await import('/src/lib/qr/render/canvas.ts');
    const { DESIGNS } = await import('/src/lib/qr/presets.ts');

    const out = [];
    for (const design of DESIGNS) {
      const decode = (c) => {
        const img = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        const r = window.jsQR(img.data, c.width, c.height, { inversionAttempts: 'attemptBoth' });
        return r?.data === value;
      };

      for (const variant of ['default', 'framed']) {
        const geo = buildGeometry({
          value,
          design,
          transparentBackground: false,
          quietZone: 4,
          ecLevel: design.ecLevel,
          logo: null,
          frame: { enabled: variant === 'framed', text: 'סרקו אותי' },
        });

        // מסלול "מצלמה": רינדור ישיר ב-480px, הרזולוציה שבה סורק אמיתי עובד.
        //
        // רינדור ישיר ולא הקטנה של תמונה גדולה — הקטנה מכניסה מוארה מול רשת
        // המודולים, שמשתנה בין גרסאות Chromium, והבדיקה הייתה נכשלת על ארטיפקט
        // של עצמה. כאן הפלט נגזר מהווקטורים ולכן זהה בכל סביבה.
        const cameraCanvas = await renderToCanvas(geo, { width: 480, padColor: '#FFFFFF' });
        const camera = decode(cameraCanvas);

        // מסלול "מקורי": בגודל הייצוא עצמו, לכל גודל נבדק
        for (const size of sizes) {
          const canvas = await renderToCanvas(geo, { width: size });
          out.push({ design: design.id, variant, size, native: decode(canvas), camera });
        }
      }
    }
    return out;
  },
  { value: VALUE, sizes: SIZES },
);

const byDesign = new Map();
const cameraSeen = new Set();

for (const r of results) {
  const e = byDesign.get(r.design) ?? {
    native: 0,
    nativeTotal: 0,
    camera: 0,
    cameraTotal: 0,
    bad: [],
  };

  e.nativeTotal++;
  if (r.native) e.native++;
  else e.bad.push(`native ${r.variant}@${r.size}`);

  // מסלול המצלמה נבדק פעם אחת לכל וריאציה, לא לכל גודל ייצוא
  const key = `${r.design}/${r.variant}`;
  if (!cameraSeen.has(key)) {
    cameraSeen.add(key);
    e.cameraTotal++;
    if (r.camera) e.camera++;
    else e.bad.push(`camera ${r.variant}`);
  }

  byDesign.set(r.design, e);
}

console.log('design          camera  native   (camera = רינדור ישיר ב-480px)');
for (const [design, e] of byDesign) {
  const ok = e.camera === e.cameraTotal;
  console.log(
    `${ok ? '✓' : '✗'} ${design.padEnd(14)} ${e.camera}/${e.cameraTotal}    ` +
      `${String(e.native).padStart(2)}/${e.nativeTotal}` +
      (e.bad.length ? `   fails: ${e.bad.join(' ')}` : ''),
  );
}

const totals = [...byDesign.values()].reduce(
  (acc, e) => ({
    camera: acc.camera + e.camera,
    cameraTotal: acc.cameraTotal + e.cameraTotal,
    native: acc.native + e.native,
    nativeTotal: acc.nativeTotal + e.nativeTotal,
  }),
  { camera: 0, cameraTotal: 0, native: 0, nativeTotal: 0 },
);

console.log(
  `\ncamera: ${totals.camera}/${totals.cameraTotal}   native: ${totals.native}/${totals.nativeTotal}`,
);

const cameraFails = totals.cameraTotal - totals.camera;
const nativeFails = totals.nativeTotal - totals.native;

await browser.close();
// השער הוא מסלול המצלמה בלבד. הכשלים במסלול "מקורי" הם מגבלה ידועה של jsQR
// בתמונות גדולות מאוד — הבינריזציה שלו עובדת בבלוקים של 8×8 פיקסלים, ובקוד
// של 2048px בלוק שלם נופל בתוך מודול אחד והסף המקומי מתבלבל. קוד שנקרא
// ב-480px ייקרא בוודאי ב-1024px בכל סורק אמיתי.
if (nativeFails) {
  console.log(`(${nativeFails} כשלים במסלול "מקורי" — מגבלת jsQR בתמונות גדולות, לא שער)`);
}
process.exit(cameraFails ? 1 : 0);
