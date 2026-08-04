type ClassValue = string | number | false | null | undefined | ClassValue[];

/** מחבר שמות מחלקות ומדלג על ערכים ריקים. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (Array.isArray(v)) {
      const nested = cn(...v);
      if (nested) out.push(nested);
    } else {
      out.push(String(v));
    }
  }
  return out.join(' ');
}
