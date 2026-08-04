import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGeometry } from '@/lib/qr/geometry';
import { DEFAULT_DESIGN, DESIGN_BY_ID } from '@/lib/qr/presets';
import type {
  EcLevel,
  EyeBallShape,
  EyeFrameShape,
  LogoSpec,
  ModuleShape,
  Paint,
  QrDesign,
  QrGeometry,
  QrOptions,
} from '@/lib/qr/types';
import {
  CONTENT_TYPES,
  contentNote,
  type ContentKind,
  type FieldValues,
} from '@/lib/qr/content';
import { DEFAULT_SIZE, SIZE_BY_ID, type SizePreset } from '@/lib/sizes';
import { loadSettings, saveSettings } from '@/lib/storage';
import { useDebounced } from './useDebounced';

export interface StudioState {
  /** סוג התוכן הפעיל */
  contentKind: ContentKind;
  /** ערכי הטופס לכל סוג, כדי שמעבר בין סוגים לא ימחק מה שכבר הוקלד */
  contentValues: Record<ContentKind, FieldValues>;
  designId: string;
  sizeId: string;
  quietZone: number;
  ecLevel: EcLevel;
  transparent: boolean;
  /** null = ירושה מהעיצוב הנבחר */
  moduleShape: ModuleShape | null;
  eyeFrame: EyeFrameShape | null;
  eyeBall: EyeBallShape | null;
  dotScale: number | null;
  cornerRadius: number | null;
  bodyOverride: Paint | null;
  backgroundOverride: Paint | null;
  logo: LogoSpec | null;
  frameEnabled: boolean;
  frameText: string;
  /**
   * קוד דינמי פעיל.
   *
   * כשהוא מוגדר, הכתובת הקצרה שלו דורסת את התוכן שהוקלד — זה בדיוק העניין
   * בקוד דינמי: הקוד מצביע על כתובת קבועה, והיעד שמאחוריה משתנה.
   */
  dynamic: { id: string; url: string; title: string } | null;
}

const EMPTY_VALUES = Object.fromEntries(
  (Object.keys(CONTENT_TYPES) as ContentKind[]).map((k) => [k, {}]),
) as Record<ContentKind, FieldValues>;

const INITIAL: StudioState = {
  contentKind: 'link',
  contentValues: EMPTY_VALUES,
  designId: DEFAULT_DESIGN.id,
  sizeId: DEFAULT_SIZE.id,
  quietZone: 4,
  ecLevel: 'Q',
  transparent: false,
  moduleShape: null,
  eyeFrame: null,
  eyeBall: null,
  dotScale: null,
  cornerRadius: null,
  bodyOverride: null,
  backgroundOverride: null,
  logo: null,
  frameEnabled: false,
  frameText: 'סרקו אותי',
  dynamic: null,
};

function hydrate(): StudioState {
  const saved = loadSettings();
  if (!saved) return INITIAL;
  return {
    ...INITIAL,
    designId: saved.designId && DESIGN_BY_ID.has(saved.designId) ? saved.designId : INITIAL.designId,
    sizeId: saved.sizeId && SIZE_BY_ID.has(saved.sizeId) ? saved.sizeId : INITIAL.sizeId,
    quietZone: saved.quietZone ?? INITIAL.quietZone,
    ecLevel: saved.ecLevel ?? INITIAL.ecLevel,
    transparent: saved.transparentBackground ?? INITIAL.transparent,
    moduleShape: saved.moduleShape ?? null,
    dotScale: saved.dotScale ?? null,
    cornerRadius: saved.cornerRadius ?? null,
    bodyOverride: saved.bodyOverride ?? null,
    backgroundOverride: saved.backgroundOverride ?? null,
    frameEnabled: saved.frameEnabled ?? INITIAL.frameEnabled,
    frameText: saved.frameText ?? INITIAL.frameText,
  };
}

export interface StudioApi {
  state: StudioState;
  patch: (partial: Partial<StudioState>) => void;
  setField: (name: string, value: string) => void;
  loadContent: (kind: ContentKind, values: FieldValues) => void;
  reset: () => void;
  /** מאפס רק את ההתאמות הידניות, ומחזיר את העיצוב לברירת המחדל שלו */
  resetCustomizations: () => void;
  design: QrDesign;
  size: SizePreset;
  /** הערך הסופי שנכנס לקוד (אחרי נרמול כתובת) */
  encodedValue: string;
  inputNote: string | null;
  /** הגאומטריה של הקוד שמוצג כרגע; null כשאין קלט */
  geometry: QrGeometry | null;
  /** בונה קוד בערך אחר עם אותן הגדרות עיצוב — לייצור באצווה. זורק בכישלון */
  buildWith: (value: string, frameText?: string | null) => QrGeometry;
  /** גאומטריה של תצוגה מקדימה "נקייה" — לגלריית העיצובים */
  buildPreview: (design: QrDesign) => QrGeometry | null;
  error: string | null;
  isEmpty: boolean;
}

/** מגבלה מעשית: מעבר לכך הקוד נעשה צפוף מדי לסריקה אמינה מהטלפון. */
const MAX_LENGTH = 1200;

export function useQrStudio(): StudioApi {
  const [state, setState] = useState<StudioState>(hydrate);

  const rawValue = useMemo(
    () =>
      state.dynamic?.url ??
      CONTENT_TYPES[state.contentKind].encode(state.contentValues[state.contentKind] ?? {}),
    [state.dynamic, state.contentKind, state.contentValues],
  );
  const debouncedValue = useDebounced(rawValue, 200);

  const design = DESIGN_BY_ID.get(state.designId) ?? DEFAULT_DESIGN;
  const size = SIZE_BY_ID.get(state.sizeId) ?? DEFAULT_SIZE;

  const patch = useCallback((partial: Partial<StudioState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  /** מעדכן שדה בודד בטופס של הסוג הפעיל. */
  const setField = useCallback((name: string, value: string) => {
    setState((prev) => ({
      ...prev,
      contentValues: {
        ...prev.contentValues,
        [prev.contentKind]: { ...prev.contentValues[prev.contentKind], [name]: value },
      },
    }));
  }, []);

  /** טוען ערכים מוכנים לסוג מסוים — לשחזור מההיסטוריה. */
  const loadContent = useCallback((kind: ContentKind, values: FieldValues) => {
    setState((prev) => ({
      ...prev,
      contentKind: kind,
      contentValues: { ...prev.contentValues, [kind]: values },
    }));
  }, []);

  const resetCustomizations = useCallback(() => {
    setState((prev) => ({
      ...prev,
      moduleShape: null,
      eyeFrame: null,
      eyeBall: null,
      dotScale: null,
      cornerRadius: null,
      bodyOverride: null,
      backgroundOverride: null,
      quietZone: 4,
      ecLevel: DESIGN_BY_ID.get(prev.designId)?.ecLevel ?? 'Q',
    }));
  }, []);

  /**
   * אותן הגדרות עיצוב, ערך אחר.
   *
   * `frameText` מפורש דורס את הכיתוב: `null` מכבה אותו, מחרוזת מדליקה אותו עם
   * הטקסט שנמסר, ו-undefined משאיר את בחירת המשתמש. זה מה שמאפשר לייצור
   * באצווה לשים כיתוב שונה מתחת לכל קוד בלי לגעת במצב.
   */
  const optionsFor = useCallback(
    (value: string, frameText?: string | null): QrOptions => ({
      value,
      design,
      bodyOverride: state.bodyOverride ?? undefined,
      eyeFrameOverride: state.bodyOverride ?? undefined,
      eyeBallOverride: state.bodyOverride ?? undefined,
      backgroundOverride: state.backgroundOverride,
      transparentBackground: state.transparent,
      quietZone: state.quietZone,
      ecLevel: state.ecLevel,
      moduleShape: state.moduleShape ?? undefined,
      eyeFrame: state.eyeFrame ?? undefined,
      eyeBall: state.eyeBall ?? undefined,
      dotScale: state.dotScale ?? undefined,
      cornerRadius: state.cornerRadius ?? undefined,
      logo: state.logo,
      frame:
        frameText === undefined
          ? { enabled: state.frameEnabled, text: state.frameText }
          : { enabled: Boolean(frameText), text: frameText ?? '' },
    }),
    [design, state],
  );

  const options = useMemo<QrOptions | null>(
    () => (debouncedValue ? optionsFor(debouncedValue) : null),
    [debouncedValue, optionsFor],
  );

  const { geometry, error } = useMemo<{ geometry: QrGeometry | null; error: string | null }>(() => {
    if (!options) return { geometry: null, error: null };
    if (options.value.length > MAX_LENGTH) {
      return { geometry: null, error: `הטקסט ארוך מדי (${options.value.length} תווים). המקסימום הוא ${MAX_LENGTH}.` };
    }
    try {
      return { geometry: buildGeometry(options), error: null };
    } catch {
      return {
        geometry: null,
        error: 'הטקסט ארוך מדי לרמת תיקון השגיאות שנבחרה. נסו לקצר אותו או לעבור לרמה נמוכה יותר.',
      };
    }
  }, [options]);

  const buildWith = useCallback(
    (value: string, frameText?: string | null): QrGeometry => buildGeometry(optionsFor(value, frameText)),
    [optionsFor],
  );

  /** תצוגה מקדימה קטנה לגלריה — תמיד עם ההגדרות המקוריות של העיצוב. */
  const buildPreview = useCallback(
    (previewDesign: QrDesign): QrGeometry | null => {
      const value = debouncedValue || 'https://example.com';
      try {
        return buildGeometry({
          value,
          design: previewDesign,
          transparentBackground: false,
          quietZone: 2.5,
          ecLevel: previewDesign.ecLevel,
          logo: null,
          backgroundOverride: undefined,
          frame: { enabled: false, text: '' },
        });
      } catch {
        return null;
      }
    },
    [debouncedValue],
  );

  // שמירת העדפות — לא כולל הקלט עצמו, שנשמר בהיסטוריה בנפרד
  useEffect(() => {
    saveSettings({
      designId: state.designId,
      sizeId: state.sizeId,
      quietZone: state.quietZone,
      ecLevel: state.ecLevel,
      transparentBackground: state.transparent,
      moduleShape: state.moduleShape,
      dotScale: state.dotScale,
      cornerRadius: state.cornerRadius,
      bodyOverride: state.bodyOverride,
      backgroundOverride: state.backgroundOverride,
      frameEnabled: state.frameEnabled,
      frameText: state.frameText,
      theme: 'system',
    });
  }, [state]);

  return {
    state,
    patch,
    setField,
    loadContent,
    reset,
    resetCustomizations,
    design,
    size,
    encodedValue: debouncedValue,
    inputNote: state.dynamic
      ? 'הקוד מצביע על הכתובת הקצרה — אפשר להחליף את היעד בכל רגע'
      : contentNote(state.contentKind, state.contentValues[state.contentKind] ?? {}),
    geometry,
    buildWith,
    buildPreview,
    error,
    isEmpty: !rawValue,
  };
}
