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
import { DEFAULT_SIZE, SIZE_BY_ID, type SizePreset } from '@/lib/sizes';
import { loadSettings, saveSettings } from '@/lib/storage';
import { checkInput } from '@/lib/url';
import { useDebounced } from './useDebounced';

export interface StudioState {
  input: string;
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
}

const INITIAL: StudioState = {
  input: '',
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
  /** גאומטריה של תצוגה מקדימה "נקייה" — לגלריית העיצובים */
  buildPreview: (design: QrDesign) => QrGeometry | null;
  error: string | null;
  isEmpty: boolean;
}

/** מגבלה מעשית: מעבר לכך הקוד נעשה צפוף מדי לסריקה אמינה מהטלפון. */
const MAX_LENGTH = 1200;

export function useQrStudio(): StudioApi {
  const [state, setState] = useState<StudioState>(hydrate);
  const debouncedInput = useDebounced(state.input, 200);

  const design = DESIGN_BY_ID.get(state.designId) ?? DEFAULT_DESIGN;
  const size = SIZE_BY_ID.get(state.sizeId) ?? DEFAULT_SIZE;

  const patch = useCallback((partial: Partial<StudioState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => setState({ ...INITIAL, input: '' }), []);

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

  const check = useMemo(() => checkInput(debouncedInput), [debouncedInput]);

  const options = useMemo<QrOptions | null>(() => {
    if (!check.normalized) return null;
    return {
      value: check.normalized,
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
      frame: { enabled: state.frameEnabled, text: state.frameText },
    };
  }, [check.normalized, design, state]);

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

  /** תצוגה מקדימה קטנה לגלריה — תמיד עם ההגדרות המקוריות של העיצוב. */
  const buildPreview = useCallback(
    (previewDesign: QrDesign): QrGeometry | null => {
      const value = check.normalized || 'https://example.com';
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
    [check.normalized],
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
    reset,
    resetCustomizations,
    design,
    size,
    encodedValue: check.normalized,
    inputNote: check.note,
    geometry,
    buildPreview,
    error,
    isEmpty: !state.input.trim(),
  };
}
