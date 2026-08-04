/**
 * הפניית קודים דינמיים.
 *
 * קוד QR מודפס הוא נצחי — אם הכתובת השתנתה, כל מה שהודפס הולך לפח. קוד דינמי
 * מצביע על `/r/<מזהה>` כאן, והפונקציה מפנה ליעד הנוכחי שניתן לשנות מתי שרוצים.
 *
 * שלוש החלטות שקובעות את ההתנהגות:
 *
 * 1. **מהירות לפני מדידה.** ההפניה נשלחת מיד, ורישום הסריקה נעשה אחריה. סורק
 *    שממתין לכתיבה למסד הוא סורק שנראה תקוע.
 * 2. **בלי כתובות IP.** נשמרים רק מדינה, סוג מכשיר וחותמת זמן. די כדי להבין
 *    מאיפה סורקים, ולא מספיק כדי לזהות אדם.
 * 3. **כשל בטוח.** קוד לא קיים, כבוי או שפג — מקבל דף הסבר בעברית ולא שגיאה
 *    גולמית. מי שסרק מחזיק שלט מודפס ביד, ומגיע לו הסבר.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

/** מזהה קצר — ככל שקצר יותר, כך הקוד המודפס פחות צפוף. */
const ID_PATTERN = /^[A-Za-z0-9]{4,16}$/;

function deviceType(userAgent = '') {
  if (/iPad|Tablet/i.test(userAgent)) return 'tablet';
  if (/iPhone|iPod|Android.*Mobile|Mobile/i.test(userAgent)) return 'mobile';
  if (/Android/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function platform(userAgent = '') {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

function errorPage(title, message) {
  return `<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f4f4f5;
       color:#0b0b0f;font-family:system-ui,-apple-system,'Heebo',sans-serif;padding:1.5rem}
  .card{max-width:24rem;text-align:center;background:#fff;border:1px solid #e7e7ea;
        border-radius:1.5rem;padding:2rem 1.5rem}
  h1{margin:0 0 .5rem;font-size:1.25rem}
  p{margin:0;color:#71717a;font-size:.9375rem;line-height:1.6}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

/**
 * מטפל בכל בקשה ל-`/r/<מזהה>`.
 *
 * מוגדר בפריסה כ-rewrite של Firebase Hosting, כך שהקוד מצביע על הדומיין
 * הרגיל ולא על כתובת ארוכה של פונקציה — אורך הכתובת משפיע ישירות על צפיפות
 * הקוד המודפס.
 */
export const redirect = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 20, invoker: 'public' },
  async (req, res) => {
    const id = (req.path || '').replace(/^\/+r\/+/, '').replace(/\/+$/, '').split('/')[0];

    if (!ID_PATTERN.test(id)) {
      res.status(404).type('html').send(errorPage('קוד לא תקין', 'הכתובת אינה מזהה קוד קיים.'));
      return;
    }

    let link;
    try {
      const snapshot = await db.collection('links').doc(id).get();
      link = snapshot.exists ? snapshot.data() : null;
    } catch (error) {
      console.error('lookup failed', id, error);
      res.status(500).type('html').send(errorPage('תקלה זמנית', 'נסו שוב בעוד רגע.'));
      return;
    }

    if (!link) {
      res.status(404).type('html').send(errorPage('הקוד לא נמצא', 'ייתכן שהקוד נמחק.'));
      return;
    }

    if (link.active === false) {
      res
        .status(410)
        .type('html')
        .send(errorPage('הקוד כבוי', 'בעל הקוד השבית אותו זמנית.'));
      return;
    }

    const expiresAt = link.expiresAt?.toMillis?.();
    if (expiresAt && expiresAt < Date.now()) {
      res.status(410).type('html').send(errorPage('הקוד פג', 'תוקף הקוד הזה הסתיים.'));
      return;
    }

    const userAgent = req.get('user-agent') ?? '';
    const os = platform(userAgent);

    // הפניה לפי מכשיר: אייפון לחנות של אפל, אנדרואיד לזו של גוגל
    const target =
      (os === 'ios' && link.iosTarget) || (os === 'android' && link.androidTarget) || link.target;

    if (!target) {
      res.status(500).type('html').send(errorPage('הקוד לא הוגדר', 'לקוד הזה אין יעד.'));
      return;
    }

    // ההפניה קודמת למדידה — סורק לא אמור לחכות לכתיבה למסד
    res.set('Cache-Control', 'no-store, max-age=0');
    res.redirect(302, target);

    try {
      const batch = db.batch();
      const linkRef = db.collection('links').doc(id);

      batch.update(linkRef, {
        scanCount: FieldValue.increment(1),
        lastScanAt: FieldValue.serverTimestamp(),
      });

      // בלי כתובת IP: מדינה וסוג מכשיר בלבד
      batch.set(linkRef.collection('scans').doc(), {
        at: FieldValue.serverTimestamp(),
        country: req.get('x-appengine-country') ?? req.get('x-country-code') ?? 'ZZ',
        device: deviceType(userAgent),
        platform: os,
        referrer: (req.get('referer') ?? '').slice(0, 200),
      });

      await batch.commit();
    } catch (error) {
      // מדידה שנכשלה לא אמורה להשפיע על מי שסרק — הוא כבר הופנה
      console.error('scan log failed', id, error);
    }
  },
);
