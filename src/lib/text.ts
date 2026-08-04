/** גרסה מקוצרת של ערך להצגה בכרטיסים ובהיסטוריה. */
export function shortenForDisplay(value: string, max = 46): string {
  const clean = value
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
