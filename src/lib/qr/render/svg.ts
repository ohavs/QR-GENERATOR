import type { Paint, PaintedPath, QrGeometry } from '../types';
import { linearPoints, radialParams, regionsOf, type Region } from './common';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface DefsBuilder {
  defs: string[];
  ref: (paint: Paint, region: Region) => string;
}

function createDefs(idPrefix: string): DefsBuilder {
  const defs: string[] = [];
  let seq = 0;
  return {
    defs,
    ref(paint, region) {
      if (paint.type === 'solid') return paint.color;
      const id = `${idPrefix}-g${seq++}`;
      const stops = paint.stops
        .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
        .join('');
      if (paint.type === 'linear') {
        const { x1, y1, x2, y2 } = linearPoints(paint.angle, region);
        defs.push(
          `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`,
        );
      } else {
        const { cx, cy, radius } = radialParams(region);
        defs.push(
          `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${radius}">${stops}</radialGradient>`,
        );
      }
      return `url(#${id})`;
    },
  };
}

function pathEl(p: PaintedPath, region: Region, defs: DefsBuilder, transform?: string): string {
  if (!p.d) return '';
  const paint = defs.ref(p.paint, region);
  const t = transform ? ` transform="${transform}"` : '';
  if (p.stroke) {
    const dash = p.stroke.dash ? ` stroke-dasharray="${p.stroke.dash.join(' ')}"` : '';
    return `<path d="${p.d}" fill="none" stroke="${paint}" stroke-width="${p.stroke.width}" stroke-linecap="round"${dash}${t}/>`;
  }
  const rule = p.evenOdd ? ' fill-rule="evenodd"' : '';
  return `<path d="${p.d}" fill="${paint}"${rule}${t}/>`;
}

export interface SvgRenderOptions {
  /** גודל התמונה בפיקסלים (רוחב). הגובה נגזר מיחס הלוח. */
  pixelSize?: number;
  /** משפחת גופן לכיתוב */
  fontFamily?: string;
  /** תווית נגישות */
  title?: string;
  /** תחילית ל-id-ים, למניעת התנגשות כשמוצגים כמה קודים באותו עמוד */
  idPrefix?: string;
}

/** בונה מסמך SVG שלם מהגאומטריה. */
export function toSvg(geo: QrGeometry, options: SvgRenderOptions = {}): string {
  const {
    pixelSize,
    fontFamily = "'Heebo', 'Assistant', system-ui, sans-serif",
    title = 'קוד QR',
    idPrefix = 'qr',
  } = options;

  const regions = regionsOf(geo);
  const defs = createDefs(idPrefix);
  const parts: string[] = [];

  if (geo.background) parts.push(pathEl(geo.background, regions.board, defs));
  if (geo.plate) parts.push(pathEl(geo.plate, regions.board, defs));

  const shift = `translate(${geo.offset} ${geo.offset})`;
  parts.push(pathEl(geo.body, regions.qr, defs, shift));
  parts.push(pathEl(geo.eyeFrames, regions.qr, defs, shift));
  parts.push(pathEl(geo.eyeBalls, regions.qr, defs, shift));

  if (geo.logo) {
    const { x, y, size, radius, padding, src, plateColor } = geo.logo;
    const clipId = `${idPrefix}-logoclip`;
    defs.defs.push(
      `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></clipPath>`,
    );
    if (padding > 0) {
      parts.push(
        `<rect x="${x - padding}" y="${y - padding}" width="${size + padding * 2}" height="${size + padding * 2}" rx="${radius + padding}" ry="${radius + padding}" fill="${plateColor}"/>`,
      );
    }
    parts.push(
      `<image href="${esc(src)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`,
    );
  }

  if (geo.frame) {
    for (const shape of geo.frame.shapes) parts.push(pathEl(shape, regions.frame, defs));
    const t = geo.frame.text;
    if (t) {
      const fill = defs.ref(t.paint, regions.frame);
      parts.push(
        `<text x="${t.x}" y="${t.y}" fill="${fill}" font-family="${esc(fontFamily)}" font-size="${t.fontSize}" font-weight="${t.weight}" text-anchor="middle" dominant-baseline="central" direction="rtl">${esc(t.value)}</text>`,
      );
    }
  }

  const ratio = geo.boardHeight / geo.boardSize;
  const dims = pixelSize
    ? ` width="${pixelSize}" height="${Math.round(pixelSize * ratio)}"`
    : ' width="100%" height="100%"';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.boardSize} ${geo.boardHeight}"${dims} role="img" aria-label="${esc(title)}" shape-rendering="geometricPrecision">` +
    `<title>${esc(title)}</title>` +
    (defs.defs.length ? `<defs>${defs.defs.join('')}</defs>` : '') +
    parts.join('') +
    '</svg>'
  );
}
