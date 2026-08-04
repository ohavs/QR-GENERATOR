import { describe, expect, it } from 'vitest';
import { CARD_TEMPLATES, TEMPLATE_BY_ID } from './templates';
import { CARD_FIELDS, type CardTemplate, type QrElement, type TextElement } from './types';

/**
 * התבניות הן דאטה, ולכן אפשר לבדוק אותן כמו דאטה.
 *
 * הבאג שהבדיקות האלה נועדו לתפוס אינו תיאורטי: ציר ה-Y נמדד באחוזים **מרוחב**
 * הכרטיס, ולכן הקצה התחתון של תבנית A5 נמצא ב-141.9 ולא ב-100. בתבנית אחת
 * מיקמתי אלמנט לפי 100 והקוד רבץ על שורת הטקסט. עין אנושית מפספסת את זה
 * בעשר תבניות; חשבון פשוט לא.
 */

const KNOWN_FIELDS = new Set(CARD_FIELDS.map((f) => f.key));

/** גובה הכרטיס באותן יחידות שבהן מתוארים האלמנטים. */
const heightUnits = (template: CardTemplate): number =>
  (template.heightMm / template.widthMm) * 100;

interface Box {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

function textBox(element: TextElement): Box {
  const lines = element.maxLines ?? 2;
  const height = element.size * (element.lineHeight ?? 1.22) * lines;
  return {
    x: element.x,
    y: element.y,
    right: element.x + element.width,
    bottom: element.y + height,
  };
}

function qrBox(element: QrElement): Box {
  const pad = element.plate?.padding ?? 0;
  return {
    x: element.x - pad,
    y: element.y - pad,
    right: element.x + element.size + pad,
    bottom: element.y + element.size + pad,
  };
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom;

describe.each(CARD_TEMPLATES.map((t) => [t.name, t] as const))('תבנית %s', (_name, template) => {
  const bottom = heightUnits(template);

  it('הקוד נמצא בתוך גבולות הכרטיס', () => {
    for (const element of template.elements) {
      if (element.kind !== 'qr') continue;
      const box = qrBox(element);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(100);
      expect(box.bottom).toBeLessThanOrEqual(bottom);
    }
  });

  it('הטקסט נמצא בתוך גבולות הכרטיס', () => {
    for (const element of template.elements) {
      if (element.kind !== 'text') continue;
      const box = textBox(element);
      expect(box.x, element.id).toBeGreaterThanOrEqual(0);
      expect(box.right, element.id).toBeLessThanOrEqual(100.5);
      // שורה אחרונה של טקסט רב-שורתי מקבלת סובלנות: החישוב כאן הוא חסם עליון
      expect(box.bottom, element.id).toBeLessThanOrEqual(bottom + 1);
    }
  });

  it('הקוד אינו רובץ על טקסט', () => {
    // טקסט שנוגע בקוד גוזל ממנו את האזור השקט שהתקן דורש, והסריקה נכשלת
    const codes = template.elements.filter((e): e is QrElement => e.kind === 'qr').map(qrBox);
    for (const element of template.elements) {
      if (element.kind !== 'text') continue;
      const box = textBox(element);
      for (const code of codes) {
        expect(overlaps(code, box), `${element.id} חופף לקוד`).toBe(false);
      }
    }
  });

  it('שתי שורות טקסט אינן דורסות זו את זו', () => {
    // כל טקסט נמדד לפי מספר השורות המרבי שלו: כותרת שנשברת לשתי שורות היא
    // המקרה הרגיל, לא החריג, וכרטיס חייב להחזיק גם אותו
    const boxes = template.elements
      .filter((e): e is TextElement => e.kind === 'text')
      .map((e) => [e.id, textBox(e)] as const);

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i][1], boxes[j][1]), `${boxes[i][0]} / ${boxes[j][0]}`).toBe(false);
      }
    }
  });

  it('לכל שדה שהתבנית מציגה יש ערך דוגמה', () => {
    // בלי דוגמה התבנית נראית ריקה בגלריה, והמשתמש בוחר בין מלבנים לבנים
    for (const key of template.usesFields) {
      expect(template.sample[key]?.trim(), key).toBeTruthy();
    }
  });

  it('כל שדה שמצויר קיים ברשימת השדות ומוצע לעריכה', () => {
    for (const element of template.elements) {
      if (element.kind !== 'text' || element.field === null) continue;
      expect(KNOWN_FIELDS.has(element.field), element.field).toBe(true);
      expect(template.usesFields, element.field).toContain(element.field);
    }
  });

  it('טקסט קבוע אינו מתחזה לשדה ריק', () => {
    for (const element of template.elements) {
      if (element.kind !== 'text') continue;
      if (element.field === null) expect(element.text?.trim()).toBeTruthy();
    }
  });
});

describe('אוסף התבניות', () => {
  it('מזהים ייחודיים', () => {
    const ids = CARD_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TEMPLATE_BY_ID.size).toBe(ids.length);
  });

  it('לכל תבנית יש בדיוק קוד אחד', () => {
    for (const template of CARD_TEMPLATES) {
      const codes = template.elements.filter((e) => e.kind === 'qr');
      expect(codes, template.id).toHaveLength(1);
    }
  });

  it('כל קבוצה מיוצגת', () => {
    for (const group of ['scan', 'business', 'label'] as const) {
      expect(CARD_TEMPLATES.filter((t) => t.group === group).length, group).toBeGreaterThan(0);
    }
  });

  it('קוד על רקע לא לבן מקבל משטח בהיר', () => {
    // הקוד מצויר בצבע שהמשתמש בחר; בלי משטח, רקע כהה חודר לאזור השקט
    for (const template of CARD_TEMPLATES) {
      const code = template.elements.find((e): e is QrElement => e.kind === 'qr')!;
      if (code.plate) continue;

      // אין משטח על האלמנט — חייבת להיות צורה בהירה שמכסה את הקוד
      const box = qrBox(code);
      const covered = template.elements.some(
        (e) =>
          e.kind === 'shape' &&
          /^#(F|E)/i.test(typeof e.fill === 'object' && e.fill.type === 'solid' ? e.fill.color : '') &&
          e.x <= box.x &&
          e.y <= box.y &&
          e.x + e.width >= box.right &&
          e.y + e.height >= box.bottom,
      );
      const lightBackground =
        template.background.type === 'solid' && /^#(F|E)/i.test(template.background.color);

      expect(covered || lightBackground, template.id).toBe(true);
    }
  });
});
