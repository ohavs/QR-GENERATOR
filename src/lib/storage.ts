import { CONTENT_TYPES, type ContentKind, type FieldValues } from './qr/content';
import type { EcLevel, ModuleShape, Paint } from './qr/types';

const HISTORY_KEY = 'qr-studio:history:v1';
const SETTINGS_KEY = 'qr-studio:settings:v1';
const MAX_HISTORY = 24;

export interface HistoryEntry {
  id: string;
  /** הערך המקודד — משמש להשוואה ולתצוגה */
  value: string;
  /** סוג התוכן וערכי הטופס, כדי ששחזור יחזיר טופס מלא ולא רק מחרוזת */
  kind: ContentKind;
  values: FieldValues;
  designId: string;
  createdAt: number;
  /** צבע ייצוגי לתצוגה מקדימה ברשימה */
  swatch: string;
}

/** ההגדרות ששורדות רענון דף. */
export interface PersistedSettings {
  designId: string;
  sizeId: string;
  quietZone: number;
  ecLevel: EcLevel;
  transparentBackground: boolean;
  moduleShape: ModuleShape | null;
  dotScale: number | null;
  cornerRadius: number | null;
  bodyOverride: Paint | null;
  backgroundOverride: Paint | null;
  frameEnabled: boolean;
  frameText: string;
  theme: 'light' | 'dark' | 'system';
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // מצב פרטי / מכסת אחסון מלאה — לא סיבה להפיל את הכלי
  }
}

export function loadHistory(): HistoryEntry[] {
  const entries = read<HistoryEntry[]>(HISTORY_KEY) ?? [];
  return (
    entries
      .map((e) => ({
        ...e,
        // רשומות מגרסה קודמת שמרו מחרוזת בלבד — משוחזרות ככתובת
        kind: e.kind ?? 'link',
        values: e.values ?? { url: e.value },
      }))
      /*
        רשומה שסוג התוכן שלה כבר לא קיים מסוננת החוצה.

        סוג "טקסט" הוסר, ובלי הסינון הזה שחזור רשומה ישנה היה ניגש למפה
        במפתח שאינו קיים ומפיל את המסך — כלומר שינוי בקוד היה שובר את
        האפליקציה למי שכבר השתמש בה, ורק לו.
      */
      .filter((e) => e.kind in CONTENT_TYPES)
  );
}

export function pushHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry[] {
  const existing = loadHistory().filter((e) => e.value !== entry.value);
  const next: HistoryEntry[] = [
    { ...entry, id: crypto.randomUUID(), createdAt: Date.now() },
    ...existing,
  ].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  write(HISTORY_KEY, next);
  return next;
}

/**
 * מחזיר רשומה שנמחקה למקומה המקורי.
 *
 * לא `pushHistory`: היא הייתה מקפיצה את הרשומה לראש הרשימה ומשנה את זמן
 * היצירה. ביטול צריך להחזיר את המצב שהיה, לא ליצור מצב חדש שדומה לו.
 */
export function restoreHistory(entry: HistoryEntry, index: number): HistoryEntry[] {
  const current = loadHistory().filter((e) => e.id !== entry.id);
  const next = [...current.slice(0, index), entry, ...current.slice(index)].slice(0, MAX_HISTORY);
  write(HISTORY_KEY, next);
  return next;
}

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

export function loadSettings(): Partial<PersistedSettings> | null {
  return read<Partial<PersistedSettings>>(SETTINGS_KEY);
}

export function saveSettings(settings: PersistedSettings): void {
  write(SETTINGS_KEY, settings);
}
