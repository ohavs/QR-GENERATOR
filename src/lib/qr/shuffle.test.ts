import { describe, expect, it } from 'vitest';
import { shuffleDesign } from './shuffle';
import { checkScanContrast, relativeLuminance } from '../contrast';

/**
 * מחולל פסאודו-אקראי דטרמיניסטי, כדי שהבדיקה תהיה חוזרת על עצמה.
 *
 * ה"חימום" חיוני: בלעדיו הפלט הראשון של LCG כמעט אינו משתנה בין זרעים
 * סמוכים, וכל ההרצות היו נופלות על אותו ענף — כלומר הבדיקה הייתה מכסה חצי
 * מהקוד ומדווחת ירוק.
 */
function seeded(seed: number): () => number {
  let state = (seed * 2654435761) % 4294967296;
  const next = (): number => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  return next;
}

describe('shuffleDesign', () => {
  it('כל שילוב מוגרל עומד בסף הניגודיות לסריקה', () => {
    // זו כל ההצדקה לפיצ'ר: הגרלה שמייצרת קוד שלא נסרק היא באג, לא הפתעה
    for (let seed = 1; seed <= 400; seed++) {
      const result = shuffleDesign(seeded(seed));
      const contrast = checkScanContrast(result.bodyOverride, result.backgroundOverride);
      expect(contrast.risk, `seed ${seed} → ${contrast.ratio.toFixed(2)}:1`).toBe('good');
    }
  });

  it('גודל המודול לא יורד לתחום שבו צורות רזות נכשלות', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(shuffleDesign(seeded(seed)).dotScale).toBeGreaterThanOrEqual(0.85);
    }
  });

  it('מחזיר ערכים חוקיים לכל שדה', () => {
    const result = shuffleDesign(seeded(42));
    expect(result.cornerRadius).toBeGreaterThanOrEqual(0);
    expect(result.cornerRadius).toBeLessThanOrEqual(0.3);
    expect(result.backgroundOverride.type).toBe('solid');
    expect(['solid', 'linear']).toContain(result.bodyOverride.type);
  });

  it('מגריל באמת — לא מחזיר את אותו שילוב פעם אחר פעם', () => {
    const combos = new Set(
      Array.from({ length: 60 }, (_, i) => JSON.stringify(shuffleDesign(seeded(i + 1)))),
    );
    expect(combos.size).toBeGreaterThan(40);
  });

  it('מגיע גם לרקעים כהים וגם לבהירים', () => {
    const luminances = Array.from({ length: 150 }, (_, i) => {
      const paint = shuffleDesign(seeded(i + 1)).backgroundOverride;
      return relativeLuminance(paint.type === 'solid' ? paint.color : '#FFFFFF');
    });

    expect(luminances.some((l) => l < 0.1), 'רקע כהה').toBe(true);
    expect(luminances.some((l) => l > 0.8), 'רקע בהיר').toBe(true);
  });
});
