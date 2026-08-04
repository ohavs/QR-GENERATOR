import { describe, expect, it } from 'vitest';
import { encode, FINDER_ORIGINS } from './encode';
import { buildGeometry } from './geometry';
import { DESIGNS, DESIGN_BY_ID } from './presets';
import type { QrOptions } from './types';

const base = (over: Partial<QrOptions> = {}): QrOptions => ({
  value: 'https://example.com/menu',
  design: DESIGN_BY_ID.get('classic')!,
  transparentBackground: false,
  quietZone: 4,
  ecLevel: 'Q',
  logo: null,
  frame: { enabled: false, text: '' },
  ...over,
});

describe('encode', () => {
  it('מסמן את שלוש תבניות האיתור, ורק אותן', () => {
    const matrix = encode('https://example.com', 'Q');
    for (const [ox, oy] of FINDER_ORIGINS(matrix.size)) {
      expect(matrix.isFinder(ox, oy)).toBe(true);
      expect(matrix.isFinder(ox + 6, oy + 6)).toBe(true);
    }
    expect(matrix.isFinder(Math.floor(matrix.size / 2), Math.floor(matrix.size / 2))).toBe(false);
  });

  it('מחזיר false מחוץ לגבולות במקום לזרוק', () => {
    const matrix = encode('x', 'L');
    expect(matrix.get(-1, 0)).toBe(false);
    expect(matrix.get(matrix.size, 0)).toBe(false);
  });

  it('זורק כשהטקסט ארוך מכדי להיכנס', () => {
    expect(() => encode('x'.repeat(5000), 'H')).toThrow();
  });
});

describe('buildGeometry', () => {
  it('הלוח הוא הקוד ועוד אזור שקט משני צדדיו', () => {
    const geo = buildGeometry(base({ quietZone: 4 }));
    expect(geo.boardSize).toBe(geo.moduleCount + 8);
    expect(geo.offset).toBe(4);
  });

  it('ללא כיתוב הלוח ריבועי', () => {
    const geo = buildGeometry(base());
    expect(geo.boardHeight).toBe(geo.boardSize);
    expect(geo.frame).toBeNull();
  });

  it('כיתוב מגדיל את הגובה בלבד, לא את הרוחב', () => {
    const geo = buildGeometry(base({ frame: { enabled: true, text: 'סרקו אותי' } }));
    expect(geo.boardHeight).toBeGreaterThan(geo.boardSize);
    expect(geo.frame?.text?.value).toBe('סרקו אותי');
  });

  it('כיתוב ריק לא מייצר מסגרת', () => {
    const geo = buildGeometry(base({ frame: { enabled: true, text: '   ' } }));
    expect(geo.frame).toBeNull();
    expect(geo.boardHeight).toBe(geo.boardSize);
  });

  it('רקע שקוף מבטל את לוח הרקע', () => {
    expect(buildGeometry(base({ transparentBackground: true })).background).toBeNull();
    expect(buildGeometry(base()).background).not.toBeNull();
  });

  it('העיניים מצוירות בכלל מילוי zig-zag כדי לקבל טבעת חלולה', () => {
    const geo = buildGeometry(base());
    expect(geo.eyeFrames.evenOdd).toBe(true);
    expect(geo.eyeFrames.d).not.toBe('');
    expect(geo.eyeBalls.d).not.toBe('');
  });

  it('לוגו עם פינוי מקטין את שטח גוף הקוד', () => {
    const withoutLogo = buildGeometry(base());
    const withLogo = buildGeometry(
      base({
        ecLevel: 'H',
        logo: {
          src: 'data:image/png;base64,AA',
          originalSrc: 'data:image/png;base64,AA',
          bgRemoval: 'off',
          scale: 0.26,
          padding: 0.12,
          radius: 0.2,
          excavate: true,
        },
      }),
    );
    expect(withLogo.body.d.length).toBeLessThan(withoutLogo.body.d.length);
    expect(withLogo.logo).not.toBeNull();
  });

  it('לוגו ללא פינוי לא נוגע בגוף הקוד', () => {
    const logo = {
      src: 'data:image/png;base64,AA',
      originalSrc: 'data:image/png;base64,AA',
      bgRemoval: 'off' as const,
      scale: 0.26,
      padding: 0.12,
      radius: 0.2,
    };
    const excavated = buildGeometry(base({ ecLevel: 'H', logo: { ...logo, excavate: true } }));
    const intact = buildGeometry(base({ ecLevel: 'H', logo: { ...logo, excavate: false } }));
    expect(intact.body.d.length).toBeGreaterThan(excavated.body.d.length);
  });

  it('לוח הריפוד של הלוגו נגזר מרקע הקוד ולא לבן קבוע', () => {
    const logo = {
      src: 'data:image/png;base64,AA',
      originalSrc: 'data:image/png;base64,AA',
      bgRemoval: 'off' as const,
      scale: 0.2,
      padding: 0.12,
      radius: 0.2,
      excavate: true,
    };
    const onDark = buildGeometry(
      base({ ecLevel: 'H', logo, design: DESIGN_BY_ID.get('oled')! }),
    );
    expect(onDark.logo?.plateColor).toBe('#000000');
  });

  it('כל 15 העיצובים מייצרים גאומטריה שלמה', () => {
    for (const design of DESIGNS) {
      const geo = buildGeometry(base({ design, ecLevel: design.ecLevel }));
      expect(geo.body.d, design.id).not.toBe('');
      expect(geo.eyeFrames.d, design.id).not.toBe('');
      expect(geo.eyeBalls.d, design.id).not.toBe('');
      expect(geo.moduleCount, design.id).toBeGreaterThan(20);
    }
  });

  it('כל צורות המודולים מייצרות נתיב לא ריק', () => {
    const shapes = [
      'square',
      'rounded',
      'dot',
      'diamond',
      'classy',
      'fluid',
      'vbars',
      'hbars',
      'star',
      'plus',
    ] as const;
    for (const moduleShape of shapes) {
      expect(buildGeometry(base({ moduleShape })).body.d, moduleShape).not.toBe('');
    }
  });

  it('אותו קלט מייצר בדיוק את אותה גאומטריה', () => {
    // הרנדרר של המסך והרנדרר של הייצוא מקבלים את אותו אובייקט; אילו הבנייה
    // לא הייתה דטרמיניסטית, הקובץ שיורד היה יכול להיות שונה מהתצוגה
    expect(buildGeometry(base()).body.d).toBe(buildGeometry(base()).body.d);
  });
});
