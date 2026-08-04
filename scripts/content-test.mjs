/**
 * בדיקת סוגי התוכן.
 *
 * לכל סוג: מקודדים ערכים לדוגמה, מוודאים שהמחרוזת תואמת את התקן, ואז מרנדרים
 * קוד QR אמיתי ומפענחים אותו בחזרה — כדי לוודא שגם תוכן ארוך (vCard, אירוע)
 * עדיין נסרק בגודל של פריים מצלמה.
 *
 * דורש שרת פיתוח פעיל (npm run dev) על פורט 5174.
 *
 *   node scripts/content-test.mjs
 */
import { launchBrowser } from './browser.mjs';
import { readFileSync } from 'node:fs';

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5174';

const CASES = {
  link: { values: { url: 'example.co.il/menu' }, expect: /^https:\/\/example\.co\.il\/menu$/ },
  text: { values: { text: 'שלום עולם' }, expect: /^שלום עולם$/ },
  wifi: {
    values: { ssid: 'Cafe;Wifi', password: 'pa,ss', security: 'WPA' },
    expect: /^WIFI:T:WPA;S:Cafe\\;Wifi;P:pa\\,ss;;$/,
  },
  whatsapp: {
    values: { phone: '050-1234567', message: 'היי' },
    expect: /^https:\/\/wa\.me\/972501234567\?text=/,
  },
  vcard: {
    values: { firstName: 'דנה', lastName: 'כהן', phone: '0501234567', email: 'dana@example.com', org: 'סטודיו' },
    expect: /BEGIN:VCARD[\s\S]*FN:דנה כהן[\s\S]*END:VCARD/,
  },
  phone: { values: { phone: '050-123-4567' }, expect: /^tel:0501234567$/ },
  email: {
    values: { to: 'a@b.com', subject: 'נושא' },
    expect: /^mailto:a@b\.com\?subject=/,
  },
  sms: { values: { phone: '0501234567', message: 'הודעה' }, expect: /^SMSTO:0501234567:הודעה$/ },
  geo: { values: { lat: '32.0853', lon: '34.7818' }, expect: /^geo:32\.0853,34\.7818$/ },
  event: {
    values: { title: 'כנס', location: 'תל אביב', start: '2026-09-01T10:00', end: '2026-09-01T12:00' },
    expect: /BEGIN:VEVENT[\s\S]*SUMMARY:כנס[\s\S]*DTSTART:\d{8}T\d{6}Z[\s\S]*END:VEVENT/,
  },
};

const browser = await launchBrowser();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGEERROR:', e.message));
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.addScriptTag({ content: readFileSync('node_modules/jsqr/dist/jsQR.js', 'utf8') });

const results = await page.evaluate(async (cases) => {
  const { CONTENT_TYPES } = await import('/src/lib/qr/content.ts');
  const { buildGeometry } = await import('/src/lib/qr/geometry.ts');
  const { renderToCanvas } = await import('/src/lib/qr/render/canvas.ts');
  const { DEFAULT_DESIGN } = await import('/src/lib/qr/presets.ts');

  const out = [];
  for (const [kind, spec] of Object.entries(cases)) {
    const encoded = CONTENT_TYPES[kind].encode(spec.values);

    // ריק מחזיר ריק — סוג בלי שדות חובה לא אמור לייצר קוד
    const emptyIsEmpty = CONTENT_TYPES[kind].encode({}) === '';

    let scanned = false;
    if (encoded) {
      const geo = buildGeometry({
        value: encoded,
        design: DEFAULT_DESIGN,
        transparentBackground: false,
        quietZone: 4,
        // תוכן ארוך דורש קוד גדול — H היא המקרה הקשה ביותר
        ecLevel: 'H',
        logo: null,
        frame: { enabled: false, text: '' },
      });
      const canvas = await renderToCanvas(geo, { width: 480 });
      const img = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const decoded = window.jsQR(img.data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth',
      });
      scanned = decoded?.data === encoded;
    }

    out.push({ kind, encoded, emptyIsEmpty, scanned, length: encoded.length });
  }
  return out;
}, CASES);

let failures = 0;
for (const r of results) {
  const matches = CASES[r.kind].expect.test(r.encoded);
  const ok = matches && r.emptyIsEmpty && r.scanned;
  if (!ok) failures++;
  console.log(
    `${ok ? '✓' : '✗'} ${r.kind.padEnd(9)} ${String(r.length).padStart(4)} תווים  ` +
      `format=${matches ? 'ok' : 'BAD'} empty=${r.emptyIsEmpty ? 'ok' : 'BAD'} scan=${r.scanned ? 'ok' : 'BAD'}` +
      (matches ? '' : `\n    got: ${JSON.stringify(r.encoded)}`),
  );
}

console.log(failures ? `\n${failures} failed` : `\nall ${results.length} content types encode and scan`);
await browser.close();
process.exit(failures ? 1 : 0);
