import type { Paint, PaintedPath, QrGeometry } from '../types';
import { linearPoints, radialParams, regionsOf, type Region } from './common';

export interface CanvasRenderOptions {
  /** רוחב היעד בפיקסלים */
  width: number;
  /** גובה היעד; ברירת מחדל — יחס הלוח */
  height?: number;
  /**
   * צבע מילוי לשוליים כשיחס היעד שונה מיחס הלוח (למשל סטורי 9:16).
   * null = שוליים שקופים.
   */
  padColor?: string | null;
  fontFamily?: string;
  /** שוליים יחסיים כשיש התאמה ליחס שונה (0–0.4) */
  margin?: number;
}

interface Placement {
  scale: number;
  ox: number;
  oy: number;
}

/** ממקם את הלוח בתוך מסגרת היעד: התאמה מדויקת אם היחס זהה, אחרת מרכוז עם שוליים. */
function place(geo: QrGeometry, w: number, h: number, margin: number): Placement {
  const boardRatio = geo.boardHeight / geo.boardSize;
  const targetRatio = h / w;
  if (Math.abs(boardRatio - targetRatio) < 0.002) {
    return { scale: w / geo.boardSize, ox: 0, oy: 0 };
  }
  const m = Math.min(w, h) * margin;
  const scale = Math.min((w - m * 2) / geo.boardSize, (h - m * 2) / geo.boardHeight);
  return {
    scale,
    ox: (w - geo.boardSize * scale) / 2,
    oy: (h - geo.boardHeight * scale) / 2,
  };
}

const px = (r: Region, p: Placement): Region => ({
  x: r.x * p.scale + p.ox,
  y: r.y * p.scale + p.oy,
  w: r.w * p.scale,
  h: r.h * p.scale,
});

function toCanvasPaint(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  region: Region,
): string | CanvasGradient {
  if (paint.type === 'solid') return paint.color;
  if (paint.type === 'linear') {
    const { x1, y1, x2, y2 } = linearPoints(paint.angle, region);
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const s of paint.stops) g.addColorStop(s.offset, s.color);
    return g;
  }
  const { cx, cy, radius } = radialParams(region);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  for (const s of paint.stops) g.addColorStop(s.offset, s.color);
  return g;
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  p: PaintedPath,
  region: Region,
  placement: Placement,
  extraShift = 0,
): void {
  if (!p.d) return;
  const path = new Path2D();
  const m = new DOMMatrix()
    .translate(placement.ox + extraShift * placement.scale, placement.oy + extraShift * placement.scale)
    .scale(placement.scale);
  path.addPath(new Path2D(p.d), m);

  const paint = toCanvasPaint(ctx, p.paint, region);
  if (p.stroke) {
    ctx.strokeStyle = paint;
    ctx.lineWidth = p.stroke.width * placement.scale;
    ctx.lineCap = 'round';
    ctx.setLineDash((p.stroke.dash ?? []).map((v) => v * placement.scale));
    ctx.stroke(path);
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = paint;
    ctx.fill(path, p.evenOdd ? 'evenodd' : 'nonzero');
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('טעינת הלוגו נכשלה'));
    img.src = src;
  });
}

/**
 * מצייר את הגאומטריה על Canvas בגודל המבוקש.
 *
 * ההגדלה היא וקטורית לחלוטין (Path2D + מטריצת טרנספורם), ולכן הפלט חד
 * באותה מידה ב-256px וב-4096px — אין דגימה מחדש של תמונה קיימת.
 */
export async function renderToCanvas(
  geo: QrGeometry,
  options: CanvasRenderOptions,
): Promise<HTMLCanvasElement> {
  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height ?? width * (geo.boardHeight / geo.boardSize)));
  const margin = options.margin ?? 0.06;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('הדפדפן לא תומך ב-Canvas 2D');

  if (options.padColor) {
    ctx.fillStyle = options.padColor;
    ctx.fillRect(0, 0, width, height);
  }

  const placement = place(geo, width, height, margin);
  const regions = regionsOf(geo);
  const boardPx = px(regions.board, placement);
  const qrPx = px(regions.qr, placement);
  const framePx = px(regions.frame, placement);

  if (geo.background) drawPath(ctx, geo.background, boardPx, placement);
  if (geo.plate) drawPath(ctx, geo.plate, boardPx, placement);

  drawPath(ctx, geo.body, qrPx, placement, geo.offset);
  drawPath(ctx, geo.eyeFrames, qrPx, placement, geo.offset);
  drawPath(ctx, geo.eyeBalls, qrPx, placement, geo.offset);

  if (geo.logo) {
    const { x, y, size, radius, padding, src } = geo.logo;
    const sx = x * placement.scale + placement.ox;
    const sy = y * placement.scale + placement.oy;
    const ss = size * placement.scale;
    const sr = radius * placement.scale;
    const sp = padding * placement.scale;

    if (sp > 0) {
      ctx.fillStyle = '#FFFFFF';
      const bg = new Path2D();
      bg.roundRect(sx - sp, sy - sp, ss + sp * 2, ss + sp * 2, sr + sp);
      ctx.fill(bg);
    }
    try {
      const img = await loadImage(src);
      ctx.save();
      const clip = new Path2D();
      clip.roundRect(sx, sy, ss, ss, sr);
      ctx.clip(clip);
      // כיסוי מלא של הריבוע תוך שמירה על יחס התמונה (כמו object-fit: cover)
      const ratio = img.width / img.height;
      const dw = ratio > 1 ? ss * ratio : ss;
      const dh = ratio > 1 ? ss : ss / ratio;
      ctx.drawImage(img, sx + (ss - dw) / 2, sy + (ss - dh) / 2, dw, dh);
      ctx.restore();
    } catch {
      // לוגו שנכשל בטעינה לא אמור להפיל את הייצוא — הקוד עצמו תקין בלעדיו
    }
  }

  if (geo.frame) {
    for (const shape of geo.frame.shapes) drawPath(ctx, shape, framePx, placement);
    const t = geo.frame.text;
    if (t) {
      const family = options.fontFamily ?? "'Heebo', 'Assistant', system-ui, sans-serif";
      ctx.fillStyle = toCanvasPaint(ctx, t.paint, framePx);
      ctx.font = `${t.weight} ${t.fontSize * placement.scale}px ${family}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillText(t.value, t.x * placement.scale + placement.ox, t.y * placement.scale + placement.oy);
    }
  }

  return canvas;
}
