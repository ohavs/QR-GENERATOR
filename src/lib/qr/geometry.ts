import { encode, FINDER_ORIGINS, FINDER_SIZE } from './encode';
import {
  circle,
  concaveFillet,
  cutRect,
  diamond,
  flower,
  plus,
  rect,
  roundedRect,
  sparkle,
  type Corners,
} from './paths';
import type {
  EyeBallShape,
  EyeFrameShape,
  ModuleShape,
  PaintedPath,
  QrGeometry,
  QrOptions,
} from './types';

/** גובה אזור הכיתוב ביחידות מודול, כפונקציה של גודל הלוח. */
function frameHeight(boardSize: number): number {
  return Math.min(7, Math.max(4, boardSize * 0.13));
}

/* ------------------------------------------------------------------ */
/* גוף הקוד                                                            */
/* ------------------------------------------------------------------ */

function moduleGlyph(shape: ModuleShape, x: number, y: number, s: number): string {
  const inset = (1 - s) / 2;
  const px = x + inset;
  const py = y + inset;
  const cx = x + 0.5;
  const cy = y + 0.5;
  const r = s / 2;

  switch (shape) {
    case 'square':
      return rect(px, py, s, s);
    case 'rounded':
      return roundedRect(px, py, s, s, [s * 0.3, s * 0.3, s * 0.3, s * 0.3]);
    case 'dot':
      return circle(cx, cy, r);
    // המקדמים מפצים על שטח שהצורה "מוותרת" עליו מול ריבוע מלא, כדי שהמודול
    // יישאר כהה מספיק לסורק. ראו scan-test.mjs.
    case 'diamond':
      // מעל ~1.3 המעוינים נושקים זה לזה באלכסון ומטשטשים את גבול המודול
      return diamond(cx, cy, r * 1.3);
    case 'classy':
      return roundedRect(px, py, s, s, [s * 0.5, 0, s * 0.5, 0]);
    case 'star':
      return sparkle(cx, cy, r * 1.42);
    case 'plus':
      return plus(cx, cy, r * 1.34);
    default:
      return rect(px, py, s, s);
  }
}

/** פסים מחוברים: מאחד רצפים לקפסולות במקום מודולים בודדים. */
function barsPath(
  on: (x: number, y: number) => boolean,
  count: number,
  s: number,
  vertical: boolean,
): string {
  const inset = (1 - s) / 2;
  let d = '';
  for (let a = 0; a < count; a++) {
    let runStart = -1;
    for (let b = 0; b <= count; b++) {
      const lit = b < count && (vertical ? on(a, b) : on(b, a));
      if (lit && runStart === -1) runStart = b;
      if (!lit && runStart !== -1) {
        const len = b - runStart;
        const r = s / 2;
        d += vertical
          ? roundedRect(a + inset, runStart + inset, s, len - inset * 2, [r, r, r, r])
          : roundedRect(runStart + inset, a + inset, len - inset * 2, s, [r, r, r, r]);
        runStart = -1;
      }
    }
  }
  return d;
}

/**
 * סגנון "זורם": כל מודול מעוגל רק בפינות שבהן שני השכנים הסמוכים כבויים,
 * ובנוסף נוספים פילֶהים קעורים בתאים הריקים — כך שרצפי מודולים מתמזגים
 * לצורה אורגנית רציפה במקום לרשת של ריבועים.
 */
function fluidPath(on: (x: number, y: number) => boolean, count: number, s: number): string {
  const inset = (1 - s) / 2;
  const r = s * 0.5;
  let d = '';

  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!on(x, y)) continue;
      const up = on(x, y - 1);
      const down = on(x, y + 1);
      const left = on(x - 1, y);
      const right = on(x + 1, y);
      const corners: Corners = [
        !up && !left ? r : 0,
        !up && !right ? r : 0,
        !down && !right ? r : 0,
        !down && !left ? r : 0,
      ];
      d += roundedRect(x + inset, y + inset, s, s, corners);
    }
  }

  // פילֶהים קעורים בתאים הכבויים, שממלאים את "הפינה החסרה" בין שני שכנים דלוקים.
  if (s > 0.94) {
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        if (on(x, y)) continue;
        if (on(x, y - 1) && on(x - 1, y)) d += concaveFillet(x, y, 1, r, 0);
        if (on(x, y - 1) && on(x + 1, y)) d += concaveFillet(x, y, 1, r, 1);
        if (on(x, y + 1) && on(x + 1, y)) d += concaveFillet(x, y, 1, r, 2);
        if (on(x, y + 1) && on(x - 1, y)) d += concaveFillet(x, y, 1, r, 3);
      }
    }
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* עיניים                                                              */
/* ------------------------------------------------------------------ */

function eyeFrameGlyph(shape: EyeFrameShape, ox: number, oy: number): string {
  const S = FINDER_SIZE; // 7
  const inner = S - 2; // 5
  const ix = ox + 1;
  const iy = oy + 1;

  switch (shape) {
    case 'square':
      return rect(ox, oy, S, S) + rect(ix, iy, inner, inner);
    case 'rounded': {
      const ro = S * 0.28;
      const ri = Math.max(0, ro - 1);
      return (
        roundedRect(ox, oy, S, S, [ro, ro, ro, ro]) +
        roundedRect(ix, iy, inner, inner, [ri, ri, ri, ri])
      );
    }
    case 'circle':
      return circle(ox + S / 2, oy + S / 2, S / 2) + circle(ox + S / 2, oy + S / 2, inner / 2);
    case 'leaf': {
      const ro = S * 0.5;
      const ri = inner * 0.5;
      return (
        roundedRect(ox, oy, S, S, [ro, 0, ro, 0]) + roundedRect(ix, iy, inner, inner, [ri, 0, ri, 0])
      );
    }
    case 'shield': {
      const ro = S * 0.42;
      const ri = Math.max(0, ro - 1);
      return (
        roundedRect(ox, oy, S, S, [ro, ro, ro, 0]) +
        roundedRect(ix, iy, inner, inner, [ri, ri, ri, 0])
      );
    }
    case 'cut':
      // הקיטום נשאר מתון: סורקים מזהים את תבנית האיתור לפי יחס 1:1:3:1:1
      // לאורך קווי סריקה, וקיטום עמוק שובר את היחס בשורות הקרובות לקצה.
      return cutRect(ox, oy, S, S, 1.2) + cutRect(ix, iy, inner, inner, 0.85);
    default:
      return rect(ox, oy, S, S) + rect(ix, iy, inner, inner);
  }
}

function eyeBallGlyph(shape: EyeBallShape, ox: number, oy: number): string {
  const cx = ox + FINDER_SIZE / 2;
  const cy = oy + FINDER_SIZE / 2;
  const bx = ox + 2;
  const by = oy + 2;
  const size = 3;

  switch (shape) {
    case 'square':
      return rect(bx, by, size, size);
    case 'rounded':
      return roundedRect(bx, by, size, size, [1, 1, 1, 1]);
    case 'circle':
      return circle(cx, cy, size / 2);
    case 'diamond':
      // חייב להישאר בתוך 3×3: גלישה אל טבעת ההפרדה הלבנה הורסת את תבנית האיתור
      return diamond(cx, cy, size / 2);
    case 'leaf':
      return roundedRect(bx, by, size, size, [1.5, 0, 1.5, 0]);
    case 'flower':
      return flower(cx, cy, size / 2);
    default:
      return rect(bx, by, size, size);
  }
}

/* ------------------------------------------------------------------ */
/* מסגרת הכיתוב                                                        */
/* ------------------------------------------------------------------ */

function buildFrame(
  opts: QrOptions,
  boardSize: number,
  fh: number,
  radius: number,
): QrGeometry['frame'] {
  const design = opts.design;
  const style = design.frameStyle;
  const text = opts.frame.text.trim();
  const shapes: PaintedPath[] = [];
  const top = boardSize;
  const bottom = boardSize + fh;

  switch (style) {
    case 'bottomBar':
      shapes.push({
        d: roundedRect(0, top, boardSize, fh, [0, 0, radius, radius]),
        paint: design.frameBarPaint,
      });
      break;
    case 'pill': {
      const w = Math.min(boardSize * 0.74, Math.max(boardSize * 0.5, text.length * fh * 0.34 + fh));
      const h = fh * 0.74;
      const x = (boardSize - w) / 2;
      const y = top + (fh - h) / 2;
      shapes.push({ d: roundedRect(x, y, w, h, [h / 2, h / 2, h / 2, h / 2]), paint: design.frameBarPaint });
      break;
    }
    case 'ribbon': {
      const h = fh * 0.8;
      const y = top + (fh - h) / 2;
      const notch = h * 0.45;
      const inset = boardSize * 0.06;
      const w = boardSize - inset * 2;
      shapes.push({
        d:
          `M${inset} ${y}H${inset + w}L${inset + w - notch} ${y + h / 2}L${inset + w} ${y + h}` +
          `H${inset}L${inset + notch} ${y + h / 2}Z`,
        paint: design.frameBarPaint,
      });
      break;
    }
    case 'ticket': {
      shapes.push({
        d: roundedRect(0, top, boardSize, fh, [0, 0, radius, radius]),
        paint: design.frameBarPaint,
      });
      shapes.push({
        d: `M${boardSize * 0.08} ${top}H${boardSize * 0.92}`,
        paint: design.frameTextPaint,
        stroke: { width: 0.18, dash: [0.7, 0.7] },
      });
      break;
    }
    case 'outline':
      // הטקסט יושב ישירות על הלוח; קו המתאר מגיע מ-plate.
      break;
    default:
      return null;
  }

  return {
    shapes,
    text: text
      ? {
          value: text,
          paint: design.frameTextPaint,
          x: boardSize / 2,
          y: (top + bottom) / 2,
          fontSize: fh * 0.46,
          weight: 700,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* נקודת הכניסה                                                        */
/* ------------------------------------------------------------------ */

/**
 * ממיר טקסט + עיצוב לגאומטריה מלאה ביחידות מודול.
 *
 * זורק שגיאה אם הטקסט לא ניתן לקידוד ברמת התיקון שנבחרה.
 */
export function buildGeometry(opts: QrOptions): QrGeometry {
  const design = opts.design;
  const matrix = encode(opts.value, opts.ecLevel);
  const count = matrix.size;

  const quiet = Math.max(0, opts.quietZone);
  const boardSize = count + quiet * 2;
  const offset = quiet;
  const radiusPct = opts.cornerRadius ?? design.cornerRadius;
  const radius = boardSize * radiusPct;

  const moduleShape = opts.moduleShape ?? design.moduleShape;
  const eyeFrame = opts.eyeFrame ?? design.eyeFrame;
  const eyeBall = opts.eyeBall ?? design.eyeBall;
  const dotScale = Math.max(0.4, Math.min(1, opts.dotScale ?? design.dotScale));

  const showFrame = opts.frame.enabled && design.frameStyle !== 'none' && !!opts.frame.text.trim();
  const fh = showFrame ? frameHeight(boardSize) : 0;
  const boardHeight = boardSize + fh;

  /* אזור הלוגו — נחשב מראש כדי לנקות מודולים שמתחתיו */
  let logoRect: { x0: number; y0: number; x1: number; y1: number } | null = null;
  let logo: QrGeometry['logo'] = null;
  if (opts.logo) {
    const size = count * Math.max(0.1, Math.min(0.32, opts.logo.scale));
    const pad = size * opts.logo.padding;
    const x = offset + (count - size) / 2;
    const y = offset + (count - size) / 2;
    logo = { x, y, size, radius: size * opts.logo.radius, padding: pad, src: opts.logo.src };
    if (opts.logo.excavate) {
      const half = size / 2 + pad;
      const c = count / 2;
      logoRect = { x0: c - half, y0: c - half, x1: c + half, y1: c + half };
    }
  }

  const excavated = (x: number, y: number): boolean => {
    if (!logoRect) return false;
    return x + 1 > logoRect.x0 && x < logoRect.x1 && y + 1 > logoRect.y0 && y < logoRect.y1;
  };

  /** מודול שייך לגוף הקוד: דלוק, לא חלק מהעיניים, ולא הוסר בגלל הלוגו. */
  const on = (x: number, y: number): boolean =>
    matrix.get(x, y) && !matrix.isFinder(x, y) && !excavated(x, y);

  let bodyD: string;
  if (moduleShape === 'vbars') bodyD = barsPath(on, count, dotScale, true);
  else if (moduleShape === 'hbars') bodyD = barsPath(on, count, dotScale, false);
  else if (moduleShape === 'fluid') bodyD = fluidPath(on, count, dotScale);
  else {
    let d = '';
    for (let y = 0; y < count; y++) {
      for (let x = 0; x < count; x++) {
        if (on(x, y)) d += moduleGlyph(moduleShape, x, y, dotScale);
      }
    }
    bodyD = d;
  }

  let framesD = '';
  let ballsD = '';
  for (const [ox, oy] of FINDER_ORIGINS(count)) {
    framesD += eyeFrameGlyph(eyeFrame, ox, oy);
    ballsD += eyeBallGlyph(eyeBall, ox, oy);
  }

  const bg = opts.transparentBackground ? null : (opts.backgroundOverride ?? design.background);

  return {
    moduleCount: count,
    boardSize,
    boardHeight,
    offset,
    background: bg
      ? { d: roundedRect(0, 0, boardSize, boardHeight, [radius, radius, radius, radius]), paint: bg }
      : null,
    plate: design.plate
      ? {
          d: roundedRect(
            design.plate.inset,
            design.plate.inset,
            boardSize - design.plate.inset * 2,
            boardHeight - design.plate.inset * 2,
            Array(4).fill(Math.max(0, radius - design.plate.inset)) as Corners,
          ),
          paint: design.plate.strokePaint,
          stroke: { width: design.plate.width, dash: design.plate.dashed ? [1.1, 0.9] : undefined },
        }
      : null,
    body: { d: bodyD, paint: opts.bodyOverride ?? design.body },
    eyeFrames: { d: framesD, paint: opts.eyeFrameOverride ?? design.eyeFramePaint, evenOdd: true },
    eyeBalls: { d: ballsD, paint: opts.eyeBallOverride ?? design.eyeBallPaint },
    frame: showFrame ? buildFrame(opts, boardSize, fh, radius) : null,
    logo,
  };
}
