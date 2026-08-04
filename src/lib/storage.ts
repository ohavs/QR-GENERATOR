import type { EcLevel, ModuleShape, Paint } from './qr/types';

const HISTORY_KEY = 'qr-studio:history:v1';
const SETTINGS_KEY = 'qr-studio:settings:v1';
const MAX_HISTORY = 24;

export interface HistoryEntry {
  id: string;
  value: string;
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
  return read<HistoryEntry[]>(HISTORY_KEY) ?? [];
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

export function clearHistory(): void {
  write(HISTORY_KEY, []);
}

export function loadSettings(): Partial<PersistedSettings> | null {
  return read<Partial<PersistedSettings>>(SETTINGS_KEY);
}

export function saveSettings(settings: PersistedSettings): void {
  write(SETTINGS_KEY, settings);
}
