/**
 * בדיקת הסרת הרקע מלוגו.
 *
 * שלוש טענות שחייבות להתקיים:
 *   1. הרקע החיצוני נעלם.
 *   2. גוף הלוגו נשאר אטום.
 *   3. שטח לבן *בתוך* הלוגו נשאר — זה ההבדל בין מילוי משטח מהשוליים לבין
 *      מחיקת כל פיקסל לבן, וזה מה שמונע חורים באמצע הלוגו.
 * ובנוסף: תמונה בלי רקע אחיד לא משתנה בכלל.
 *
 * דורש שרת פיתוח פעיל (npm run dev) על פורט 5174.
 *
 *   node scripts/logo-bg-test.mjs
 */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
p.on('pageerror', e=>console.error('PAGEERROR:', e.message));
await p.goto(process.env.ORIGIN ?? 'http://localhost:5174/', { waitUntil:'domcontentloaded' });

const res = await p.evaluate(async () => {
  const { removeBackground } = await import('/src/lib/logo/removeBackground.ts');

  // לוגו סינתטי: עיגול כחול עם "חור" לבן במרכז, על רקע לבן.
  // החור חייב להישאר לבן — הוא לא מחובר לשוליים.
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0,0,200,200);
  x.fillStyle = '#1D4ED8'; x.beginPath(); x.arc(100,100,70,0,7); x.fill();
  x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(100,100,25,0,7); x.fill();
  const src = c.toDataURL('image/png');

  const out = [];
  for (const strength of ['gentle','normal','strong']) {
    const r = await removeBackground(src, strength);
    const img = new Image(); img.src = r.src;
    await img.decode();
    const c2 = document.createElement('canvas');
    c2.width = img.width; c2.height = img.height;
    const x2 = c2.getContext('2d');
    x2.drawImage(img,0,0);
    const px = (px_, py) => {
      const d = x2.getImageData(px_, py, 1, 1).data;
      return { r:d[0], g:d[1], b:d[2], a:d[3] };
    };
    const w = img.width, h = img.height;
    out.push({
      strength,
      changed: r.changed,
      corner: px(2,2).a,                    // רקע חיצוני → צריך 0
      ring: px(Math.round(w/2), Math.round(h*0.25)).a,  // גוף הלוגו → צריך 255
      hole: px(Math.round(w/2), Math.round(h/2)).a,     // חור פנימי לבן → צריך להישאר 255
      holeColor: px(Math.round(w/2), Math.round(h/2)),
    });
  }

  // תמונה בלי רקע אחיד — לא אמורה להשתנות
  const c3 = document.createElement('canvas');
  c3.width = c3.height = 100;
  const x3 = c3.getContext('2d');
  const grad = x3.createLinearGradient(0,0,100,100);
  grad.addColorStop(0,'#FF0000'); grad.addColorStop(1,'#0000FF');
  x3.fillStyle = grad; x3.fillRect(0,0,100,100);
  const noBg = await removeBackground(c3.toDataURL('image/png'), 'normal');

  return { out, gradientChanged: noBg.changed };
});

for (const r of res.out) {
  const ok = r.changed && r.corner === 0 && r.ring === 255 && r.hole === 255;
  console.log(`${ok?'✓':'✗'} ${r.strength.padEnd(7)} corner_alpha=${r.corner} logo_alpha=${r.ring} inner_hole_alpha=${r.hole} (rgb ${r.holeColor.r},${r.holeColor.g},${r.holeColor.b})`);
}
console.log(`${res.gradientChanged===false?'✓':'✗'} תמונת גרדיאנט ללא רקע אחיד: changed=${res.gradientChanged} (מצופה false)`);

const failed = res.out.some((r) => !(r.changed && r.corner === 0 && r.ring === 255 && r.hole === 255)) ||
  res.gradientChanged !== false;
await b.close();
process.exit(failed ? 1 : 0);
