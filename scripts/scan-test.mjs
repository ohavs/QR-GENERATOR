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
const SIZES = [256, 400, 1024];

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

        for (const size of sizes) {
          const canvas = await renderToCanvas(geo, { width: size });

          const decode = (c) => {
            const img = c.getContext('2d').getImageData(0, 0, c.width, c.height);
            const r = window.jsQR(img.data, c.width, c.height, {
              inversionAttempts: 'attemptBoth',
            });
            return r?.data === value;
          };

          // מסלול שני: הקטנה ל-480px, כדי לדמות פריים של מצלמת טלפון.
          // jsQR מתקשה בתמונות גדולות מאוד — סורקים אמיתיים דוגמים פריים בגודל כזה.
          const camera = document.createElement('canvas');
          const cw = 480;
          camera.width = cw;
          camera.height = Math.round((canvas.height / canvas.width) * cw);
          const cctx = camera.getContext('2d');
          cctx.fillStyle = '#fff';
          cctx.fillRect(0, 0, camera.width, camera.height);
          cctx.imageSmoothingQuality = 'high';
          cctx.drawImage(canvas, 0, 0, camera.width, camera.height);

          out.push({
            design: design.id,
            variant,
            size,
            native: decode(canvas),
            camera: decode(camera),
          });
        }
      }
    }
    return out;
  },
  { value: VALUE, sizes: SIZES },
);

const byDesign = new Map();
for (const r of results) {
  const e = byDesign.get(r.design) ?? { total: 0, native: 0, camera: 0, bad: [] };
  e.total++;
  if (r.native) e.native++;
  if (r.camera) e.camera++;
  if (!r.camera) e.bad.push(`${r.variant}@${r.size}`);
  byDesign.set(r.design, e);
}

console.log('design           camera   native   (camera = 480px frame, the realistic case)');
for (const [design, e] of byDesign) {
  const mark = e.camera === e.total ? '✓' : '✗';
  console.log(
    `${mark} ${design.padEnd(14)} ${String(e.camera).padStart(2)}/${e.total}   ` +
      `${String(e.native).padStart(2)}/${e.total}` +
      (e.bad.length ? `   fails: ${e.bad.join(' ')}` : ''),
  );
}

const cameraFails = results.filter((r) => !r.camera);
const nativeFails = results.filter((r) => !r.native);
console.log(
  `\ncamera: ${results.length - cameraFails.length}/${results.length}` +
    `   native: ${results.length - nativeFails.length}/${results.length}`,
);

await browser.close();
process.exit(cameraFails.length ? 1 : 0);
