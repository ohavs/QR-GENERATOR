/**
 * בוני נתיבי SVG (`d`) ביחידות "מודול".
 *
 * כל הפונקציות כאן טהורות ומחזירות מחרוזת path. אותה מחרוזת מוזנת גם ל-SVG
 * וגם ל-`new Path2D(...)` ב-Canvas, ולכן התצוגה והייצוא זהים ביט-לביט.
 */

/** קיצוץ עשרוני — שומר על גודל קבצי SVG סביר בלי לפגוע בדיוק. */
const n = (v: number): string => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

export type Corners = [tl: number, tr: number, br: number, bl: number];

/** מלבן פשוט. */
export function rect(x: number, y: number, w: number, h: number): string {
  return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
}

/** מלבן עם רדיוס נפרד לכל פינה (ערכים נחתכים לחצי מהצלע הקצרה). */
export function roundedRect(x: number, y: number, w: number, h: number, c: Corners): string {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = c.map((r) => Math.max(0, Math.min(r, max))) as Corners;
  let d = `M${n(x + tl)} ${n(y)}`;
  d += `H${n(x + w - tr)}`;
  if (tr) d += `A${n(tr)} ${n(tr)} 0 0 1 ${n(x + w)} ${n(y + tr)}`;
  d += `V${n(y + h - br)}`;
  if (br) d += `A${n(br)} ${n(br)} 0 0 1 ${n(x + w - br)} ${n(y + h)}`;
  d += `H${n(x + bl)}`;
  if (bl) d += `A${n(bl)} ${n(bl)} 0 0 1 ${n(x)} ${n(y + h - bl)}`;
  d += `V${n(y + tl)}`;
  if (tl) d += `A${n(tl)} ${n(tl)} 0 0 1 ${n(x + tl)} ${n(y)}`;
  return d + 'Z';
}

/** עיגול. */
export function circle(cx: number, cy: number, r: number): string {
  return (
    `M${n(cx - r)} ${n(cy)}` +
    `a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0` +
    `a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`
  );
}

/** מעוין (ריבוע מסובב 45°). */
export function diamond(cx: number, cy: number, r: number): string {
  return `M${n(cx)} ${n(cy - r)}L${n(cx + r)} ${n(cy)}L${n(cx)} ${n(cy + r)}L${n(cx - r)} ${n(cy)}Z`;
}

/**
 * ניצוץ ארבע-קצוות עם צלעות קעורות.
 *
 * `pinch` נשמר מתון בכוונה: קעירות עמוקה מדי מורידה את שטח המילוי של המודול,
 * והסורק מפרש אותו כמודול בהיר. עדיף ניצוץ מעט "שמן" שנסרק מאשר חד שנכשל.
 */
export function sparkle(cx: number, cy: number, r: number, pinch = 0.42): string {
  const k = r * (1 - pinch);
  return (
    `M${n(cx)} ${n(cy - r)}` +
    `C${n(cx + k)} ${n(cy - k)} ${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}` +
    `C${n(cx + k)} ${n(cy + k)} ${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + r)}` +
    `C${n(cx - k)} ${n(cy + k)} ${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}` +
    `C${n(cx - k)} ${n(cy - k)} ${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - r)}Z`
  );
}

/** צלב / פלוס עם עובי זרוע יחסי (0.5 ≈ 75% מילוי — הסף המעשי לסריקה). */
export function plus(cx: number, cy: number, r: number, arm = 0.54): string {
  const a = r * arm;
  return (
    `M${n(cx - a)} ${n(cy - r)}H${n(cx + a)}V${n(cy - a)}H${n(cx + r)}V${n(cy + a)}` +
    `H${n(cx + a)}V${n(cy + r)}H${n(cx - a)}V${n(cy + a)}H${n(cx - r)}V${n(cy - a)}` +
    `H${n(cx - a)}Z`
  );
}

/**
 * פילֶה קעור בפינת תא ריק — מה שהופך מודולים נפרדים ל"טיפה" רציפה אחת.
 *
 * `corner`: 0=שמאל-עליון, 1=ימין-עליון, 2=ימין-תחתון, 3=שמאל-תחתון.
 * דגל ה-sweep הוא 0 בכוונה: הוא בוחר את הקשת שמרכזה בתוך התא, כלומר
 * התבלטות פנימה (קעורה) ולא החוצה.
 */
export function concaveFillet(x: number, y: number, size: number, r: number, corner: number): string {
  const rr = Math.min(r, size);
  switch (corner) {
    case 0: // שמאל-עליון
      return `M${n(x)} ${n(y + rr)}L${n(x)} ${n(y)}L${n(x + rr)} ${n(y)}A${n(rr)} ${n(rr)} 0 0 0 ${n(x)} ${n(y + rr)}Z`;
    case 1: // ימין-עליון
      return `M${n(x + size - rr)} ${n(y)}L${n(x + size)} ${n(y)}L${n(x + size)} ${n(y + rr)}A${n(rr)} ${n(rr)} 0 0 0 ${n(x + size - rr)} ${n(y)}Z`;
    case 2: // ימין-תחתון
      return `M${n(x + size)} ${n(y + size - rr)}L${n(x + size)} ${n(y + size)}L${n(x + size - rr)} ${n(y + size)}A${n(rr)} ${n(rr)} 0 0 0 ${n(x + size)} ${n(y + size - rr)}Z`;
    default: // שמאל-תחתון
      return `M${n(x + rr)} ${n(y + size)}L${n(x)} ${n(y + size)}L${n(x)} ${n(y + size - rr)}A${n(rr)} ${n(rr)} 0 0 0 ${n(x + rr)} ${n(y + size)}Z`;
  }
}

/** מצולע מנקודות. */
export function polygon(points: Array<[number, number]>): string {
  if (!points.length) return '';
  return (
    points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${n(px)} ${n(py)}`).join('') + 'Z'
  );
}

/** מלבן עם פינות קטומות (chamfer). */
export function cutRect(x: number, y: number, w: number, h: number, c: number): string {
  const k = Math.min(c, Math.min(w, h) / 2);
  return polygon([
    [x + k, y],
    [x + w - k, y],
    [x + w, y + k],
    [x + w, y + h - k],
    [x + w - k, y + h],
    [x + k, y + h],
    [x, y + h - k],
    [x, y + k],
  ]);
}

/** פרח ארבע-עלים — משמש כגלגל עין דקורטיבי. */
export function flower(cx: number, cy: number, r: number): string {
  const k = r * 0.55;
  return (
    `M${n(cx)} ${n(cy - r)}` +
    `C${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}` +
    `C${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}` +
    `C${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}` +
    `C${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}Z`
  );
}

export { n as fmt };
