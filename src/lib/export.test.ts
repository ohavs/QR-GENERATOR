import { describe, expect, it } from 'vitest';
import { suggestFilename, toAsciiFilename } from './export';

/**
 * דפדפנים מבוססי Chromium שומרים הורדת Blob עם שם לא-ASCII בשם "download"
 * ומאבדים לגמרי את מה שהמשתמש הקליד. התעתיק כאן הוא מה שמונע את זה.
 */
describe('toAsciiFilename', () => {
  it('מתעתק עברית לאותיות לטיניות', () => {
    expect(toAsciiFilename('תפריט')).toBe('tpryt');
    expect(toAsciiFilename('שלום')).toBe('shlvm');
  });

  it('מתעתק אותיות סופיות כמו את הרגילות', () => {
    expect(toAsciiFilename('ךםןףץ')).toBe('kmnftz');
  });

  it('מסיר ניקוד', () => {
    expect(toAsciiFilename('שָׁלוֹם')).toBe('shlvm');
  });

  it('שומר על ASCII קיים', () => {
    expect(toAsciiFilename('my-qr_code.v2')).toBe('my-qr_code.v2');
  });

  it('ממיר רווחים ותווים אסורים למקף יחיד', () => {
    expect(toAsciiFilename('קוד   של הקפה')).toBe('kvd-shl-hkph');
    expect(toAsciiFilename('a/b\\c:d*e?f')).toBe('a-b-c-d-e-f');
  });

  it('לא מותיר מקפים או נקודות בקצוות', () => {
    expect(toAsciiFilename('...abc---')).toBe('abc');
    expect(toAsciiFilename('  שלום  ')).toBe('shlvm');
  });

  it('מונע מעבר לתיקייה אחרת', () => {
    expect(toAsciiFilename('../../etc/passwd')).toBe('etc-passwd');
  });

  it('מחזיר ריק כשאין מה לתעתק — הקורא נופל לשם ברירת המחדל', () => {
    expect(toAsciiFilename('')).toBe('');
    expect(toAsciiFilename('   ')).toBe('');
    expect(toAsciiFilename('!!!')).toBe('');
  });

  it('חותך שמות ארוכים מדי', () => {
    expect(toAsciiFilename('a'.repeat(200))).toHaveLength(80);
  });
});

describe('suggestFilename', () => {
  it('בונה שם מהערך ומזהה העיצוב', () => {
    expect(suggestFilename('https://example.co.il/menu', 'violet-flow')).toBe(
      'qr-example-co-il-menu-violet-flow',
    );
  });

  it('נופל לברירת מחדל כשאין חלק ASCII בערך', () => {
    expect(suggestFilename('שלום עולם', 'classic')).toBe('qr-code-classic');
  });

  it('מקצר ערכים ארוכים', () => {
    const name = suggestFilename(`https://example.com/${'x'.repeat(200)}`, 'oled');
    expect(name.length).toBeLessThan(60);
  });
});
