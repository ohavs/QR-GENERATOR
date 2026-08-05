/**
 * בדיקת סריקוּת: מרנדר כל עיצוב ומפענח בחזרה עם jsQR.
 * עיצוב יפה שלא נסרק הוא באג, לא טעם אישי.
 *
 * ── למה הבדיקה מודדת שיעור ולא בודקת דגימה אחת ──────────────────────
 *
 * הגרסה הקודמת פענחה כל עיצוב בגודל אחד (480px) ודרשה הצלחה. זה נראה הגיוני,
 * והיה שגוי: סריקוּת אינה תכונה בינארית של עיצוב אלא הסתברות שתלויה במטריצה,
 * בגודל הרינדור וברסטרייזר. עיצוב דקורטיבי טיפוסי כאן מפוענח בכ-94% מהצירופים
 * — ובדיקה של 30 דגימות בודדות נכשלת אז בכ-50% מהריצות, על עיצוב אחר בכל
 * פעם. זה בדיוק מה שקרה: CI אדום כמעט בכל דחיפה, וכל "תיקון" רק הזיז את
 * הכישלון לעיצוב הבא.
 *
 * לכן הבדיקה סורקת רשת של גדלים × ערכים × כיתוב, מודדת שיעור פענוח לכל עיצוב
 * ומשווה לסף. ממוצע על עשרות דגימות יציב בין סביבות; דגימה בודדת היא הטלת
 * מטבע.
 *
 * דורש שרת פיתוח פעיל (npm run dev) על הפורט שמוגדר למטה.
 *
 *   node scripts/scan-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5174';

/** אורכים שונים = גרסאות QR שונות = מטריצות עם אופי שונה. */
const VALUES = [
  'https://claude.ai/code?utm_source=qr&ref=studio',
  'https://example.co.il/menu',
  'https://a.co/x',
  'https://example.co.il/very/long/path?with=query&and=more&params=here&plus=extra',
  'WIFI:T:WPA;S:CafeNechama;P:hello-world-123;;',
];

/**
 * גדלים סביב הרזולוציה שבה סורק אמיתי עובד.
 *
 * לא במקרה כאלה שאינם מתחלקים יפה במספר המודולים: כשמספר הפיקסלים למודול
 * אינו שלם, נקודת הדגימה נופלת במקום מעט אחר בכל גודל. זה מה שהופך את הרשת
 * למדידה של שוליים אמיתיים ולא לחזרה על אותה דגימה.
 */
const SIZES = [400, 440, 480, 520, 560];

/**
 * הסף לכל עיצוב.
 *
 * העיצוב החלש ביותר עומד כרגע על 92%, ולכן 88% נותן שוליים של שתי דגימות —
 * מספיק כדי לא להתהפך על רעש, ומספיק הדוק כדי לתפוס נסיגה אמיתית: הקיטום
 * העמוק שהיה כאן קודם הוריד עיצוב ל-82%.
 */
const MIN_RATE = 0.88;

const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.addScriptTag({ content: readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8') });

const results = await page.evaluate(
  async ({ values, sizes }) => {
    const { buildGeometry } = await import('/src/lib/qr/geometry.ts');
    const { renderToCanvas } = await import('/src/lib/qr/render/canvas.ts');
    const { DESIGNS } = await import('/src/lib/qr/presets.ts');

    const out = [];
    for (const design of DESIGNS) {
      let passed = 0;
      let total = 0;
      const bad = [];

      for (const value of values) {
        for (const framed of [false, true]) {
          for (const width of sizes) {
            const geo = buildGeometry({
              value,
              design,
              transparentBackground: false,
              quietZone: 4,
              ecLevel: design.ecLevel,
              logo: null,
              frame: { enabled: framed, text: 'סרקו אותי' },
            });

            // רינדור ישיר בגודל היעד ולא הקטנה של תמונה גדולה: הקטנה מכניסה
            // מוארה מול רשת המודולים, והבדיקה נכשלת על ארטיפקט של עצמה
            const canvas = await renderToCanvas(geo, {
              width,
              height: Math.round(width * (geo.boardHeight / geo.boardSize)),
              padColor: '#FFFFFF',
            });
            const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            const decoded = window.jsQR(image.data, canvas.width, canvas.height, {
              inversionAttempts: 'attemptBoth',
            });

            total++;
            if (decoded?.data === value) passed++;
            else bad.push(`${width}${framed ? '+כיתוב' : ''}`);
          }
        }
      }

      out.push({ design: design.id, passed, total, bad });
    }
    return out;
  },
  { values: VALUES, sizes: SIZES },
);

await browser.close();

console.log('design           פענוח    שיעור');
let failures = 0;
let passedAll = 0;
let totalAll = 0;

for (const r of results) {
  const rate = r.passed / r.total;
  const ok = rate >= MIN_RATE;
  if (!ok) failures++;
  passedAll += r.passed;
  totalAll += r.total;

  console.log(
    `${ok ? '✓' : '✗'} ${r.design.padEnd(14)} ${String(r.passed).padStart(3)}/${r.total}   ` +
      `${(rate * 100).toFixed(0)}%` +
      (r.bad.length ? `   ${r.bad.slice(0, 6).join(' ')}` : ''),
  );
}

console.log(
  `\nסה״כ ${passedAll}/${totalAll} (${((passedAll / totalAll) * 100).toFixed(1)}%) · ` +
    `סף לכל עיצוב ${(MIN_RATE * 100).toFixed(0)}%`,
);

if (failures) console.log(`${failures} עיצובים מתחת לסף`);
process.exit(failures ? 1 : 0);
