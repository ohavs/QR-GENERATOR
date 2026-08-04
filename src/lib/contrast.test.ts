import { describe, expect, it } from 'vitest';
import { checkScanContrast, contrastRatio, relativeLuminance } from './contrast';
import type { Paint } from './qr/types';

const solid = (color: string): Paint => ({ type: 'solid', color });

describe('relativeLuminance', () => {
  it('תואם לערכי הקצה של WCAG', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('מקבל גם קיצור בן שלושה תווים', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#FFFFFF'), 5);
  });
});

describe('contrastRatio', () => {
  it('שחור על לבן הוא 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('סימטרי — סדר הצבעים לא משנה', () => {
    expect(contrastRatio('#047857', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#047857'), 5);
  });

  it('צבע מול עצמו הוא 1:1', () => {
    expect(contrastRatio('#5B4BFF', '#5B4BFF')).toBeCloseTo(1, 5);
  });
});

describe('checkScanContrast', () => {
  it('שחור על לבן — תקין וללא הודעה', () => {
    const result = checkScanContrast(solid('#0F172A'), solid('#FFFFFF'));
    expect(result.risk).toBe('good');
    expect(result.message).toBeNull();
  });

  it('מזהה ניגודיות גבולית', () => {
    // ירוק בינוני על לבן: נראה שונה לעין, אבל קרוב מדי בבהירות
    const result = checkScanContrast(solid('#10B981'), solid('#FFFFFF'));
    expect(result.risk).toBe('poor');
    expect(result.message).not.toBeNull();
  });

  it('מזהה ניגודיות בלתי אפשרית', () => {
    const result = checkScanContrast(solid('#EEEEEE'), solid('#FFFFFF'));
    expect(result.risk).toBe('poor');
    expect(result.ratio).toBeLessThan(1.5);
  });

  it('בגרדיאנט נבדקת העצירה הגרועה ביותר', () => {
    // עצירה כהה אחת לא מצילה גרדיאנט שהקצה השני שלו בהיר מדי
    const gradient: Paint = {
      type: 'linear',
      angle: 135,
      stops: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#F5F5F5' },
      ],
    };
    const result = checkScanContrast(gradient, solid('#FFFFFF'));
    expect(result.risk).toBe('poor');
  });

  it('רקע שקוף נבדק מול לבן — המקרה הנפוץ', () => {
    expect(checkScanContrast(solid('#FFFFFF'), null).risk).toBe('poor');
    expect(checkScanContrast(solid('#000000'), null).risk).toBe('good');
  });

  it('קוד בהיר על רקע כהה תקין באותה מידה', () => {
    const result = checkScanContrast(solid('#F8FAFC'), solid('#000000'));
    expect(result.risk).toBe('good');
  });

  it('כל 15 העיצובים המובנים עומדים בסף', async () => {
    const { DESIGNS } = await import('./qr/presets');
    for (const design of DESIGNS) {
      const result = checkScanContrast(design.body, design.background);
      expect(result.risk, `${design.name} (${result.ratio.toFixed(2)}:1)`).toBe('good');
    }
  });
});
