import { describe, expect, it } from 'vitest';
import { A4, cellPixels, layoutSheet, SHEET_PRESETS } from './sheet';

describe('layoutSheet', () => {
  it('מייצר תא לכל מקום ברשת', () => {
    for (const preset of SHEET_PRESETS) {
      const layout = layoutSheet(preset);
      expect(layout.cells, preset.id).toHaveLength(preset.columns * preset.rows);
      expect(layout.perPage).toBe(preset.columns * preset.rows);
    }
  });

  it('כל התאים בתוך גבולות הדף', () => {
    // תא שגולש נחתך במדפסת, ובגיליון מדבקות זה אומר קוד שלא נסרק
    for (const preset of SHEET_PRESETS) {
      for (const cell of layoutSheet(preset, 1.2).cells) {
        expect(cell.xMm, preset.id).toBeGreaterThanOrEqual(0);
        expect(cell.yMm, preset.id).toBeGreaterThanOrEqual(0);
        expect(cell.xMm + cell.widthMm).toBeLessThanOrEqual(A4.widthMm + 0.001);
        expect(cell.yMm + cell.heightMm).toBeLessThanOrEqual(A4.heightMm + 0.001);
      }
    }
  });

  it('התאים אינם חופפים', () => {
    const layout = layoutSheet(SHEET_PRESETS[1]);
    const preset = SHEET_PRESETS[1];
    for (let i = 0; i < layout.cells.length; i++) {
      for (let j = i + 1; j < layout.cells.length; j++) {
        const a = layout.cells[i];
        const b = layout.cells[j];
        const apart =
          a.xMm + a.widthMm <= b.xMm + 0.001 ||
          b.xMm + b.widthMm <= a.xMm + 0.001 ||
          a.yMm + a.heightMm <= b.yMm + 0.001 ||
          b.yMm + b.heightMm <= a.yMm + 0.001;
        expect(apart, `${preset.id} ${i}/${j}`).toBe(true);
      }
    }
  });

  it('שומר על יחס הגובה שנמסר', () => {
    // קוד עם כיתוב גבוה מרוחבו; התעלמות מהיחס הייתה חותכת את הכיתוב
    const layout = layoutSheet(SHEET_PRESETS[0], 1.25);
    for (const cell of layout.cells) {
      expect(cell.heightMm / cell.widthMm).toBeCloseTo(1.25, 6);
    }
  });

  it('הרשת ממורכזת בדף', () => {
    const layout = layoutSheet(SHEET_PRESETS[2], 1.4);
    const left = layout.cells[0].xMm;
    const last = layout.cells[layout.cells.length - 1];
    expect(A4.widthMm - (last.xMm + last.widthMm)).toBeCloseTo(left, 6);

    const top = layout.cells[0].yMm;
    expect(A4.heightMm - (last.yMm + last.heightMm)).toBeCloseTo(top, 6);
  });

  it('צפיפות גבוהה יותר מייצרת תא קטן יותר', () => {
    const sizes = SHEET_PRESETS.map((p) => layoutSheet(p).cellWidthMm);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeLessThan(sizes[i - 1]);
    }
  });
});

describe('cellPixels', () => {
  it('מכוון ל-300DPI', () => {
    expect(cellPixels(25.4)).toBe(300);
  });

  it('חוסם רזולוציה שתנפח את הזיכרון', () => {
    // 40 תאים ללא חסם היו מאות מגה-בייט של פיקסלים לפני הדחיסה
    expect(cellPixels(500)).toBe(1400);
  });
});
