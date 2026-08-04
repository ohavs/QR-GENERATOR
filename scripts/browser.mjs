import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * מאתר Chromium שכבר מותקן תחת `PLAYWRIGHT_BROWSERS_PATH`.
 *
 * דרוש כשגרסת חבילת Playwright מצפה למספר בילד אחר מזה שקיים בסביבה —
 * למשל בקונטיינר עם דפדפן מותקן מראש. נבחר הבילד הגבוה ביותר.
 */
function findInstalledChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return null;

  const candidates = readdirSync(root)
    .filter((name) => name.startsWith('chromium-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((name) => join(root, name, 'chrome-linux', 'chrome'));

  return candidates.find(existsSync) ?? null;
}

/**
 * משיק Chromium לבדיקות.
 *
 * קודם נותנים ל-Playwright לאתר בעצמו — זה מה שעובד ב-CI אחרי
 * `playwright install`. נתיב מקודד קשיח היה נשבר שם, כי מספר הבילד שונה.
 * רק אם ההשקה נכשלת מחפשים דפדפן מותקן מראש בסביבה.
 */
export async function launchBrowser(options = {}) {
  const override = process.env.PW_CHROMIUM_PATH;
  if (override) return chromium.launch({ ...options, executablePath: override });

  try {
    return await chromium.launch(options);
  } catch (error) {
    const fallback = findInstalledChromium();
    if (!fallback) throw error;
    return chromium.launch({ ...options, executablePath: fallback });
  }
}
