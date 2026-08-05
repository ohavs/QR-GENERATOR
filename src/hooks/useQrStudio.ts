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
  /** כמה מהקיבולת נוצלה (0–1) — לחיווי לפני שנתקעים */
  capacity: number;
  /** קוד צפוף: ניתן לסריקה, אבל דורש הדפסה גדולה */
  dense: boolean;
}

/**
 * מגבלת אורך — נמדדת בבתים ולא בתווים.
 *
 * קוד QR מקודד בתים, ואות עברית תופסת שניים. חסם של 1200 "תווים" נראה נדיב
 * ולא נגע בכלום: קידוד עברי נשבר כבר סביב 830 תווים, והמשתמש קיבל הודעת
 * שגיאה גנרית במקום חסם מובן. הערך כאן הוא קיבולת גרסה 40 ברמת תיקון Q.
 */
const MAX_BYTES = 1600;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/** ערך הדוגמה של גלריית העיצובים — קצר בכוונה, ראו `buildPreview`. */
const PREVIEW_VALUE = 'https://qr.studio/preview';

export function useQrStudio(): StudioApi {
  const [state, setState] = useState<StudioState>(hydrate);

  const rawValue = useMemo(
    () =>
      state.dynamic?.url ??
      CONTENT_TYPES[state.contentKind].encode(state.contentValues[state.contentKind] ?? {}),
    [state.dynamic, state.contentKind, state.contentValues],
  );

  /*
    ההשהיה גדלה עם התוכן.

    בניית הגאומטריה היא 3 מילישניות ב-20 תווים ו-45 ב-600, וה-SVG שנוצר קופץ
    מ-42KB למגה-בייט — כלומר עלות ההקלדה גדלה פי עשרה בדיוק כשהמשתמש מקליד
    יותר. השהיה קבועה מתאימה רק לאחד משני המצבים; כאן היא נמתחת עד 500ms כדי
    שהקלדה רציפה בטקסט ארוך לא תבנה מחדש את הכול בין תו לתו.
  */
  const bytes = byteLength(rawValue);
  const debounceMs = bytes > 900 ? 500 : bytes > 300 ? 340 : 200;
  const debouncedValue = useDebounced(rawValue, debounceMs);

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
    if (byteLength(options.value) > MAX_BYTES) {
      return {
        geometry: null,
        error: 'התוכן ארוך מדי לקוד QR אחד. קצרו אותו, או צרו קוד דינמי שמצביע על דף עם כל התוכן.',
      };
    }
    try {
      return { geometry: buildGeometry(options), error: null };
    } catch {
      return {
        geometry: null,
        error: 'התוכן ארוך מדי לרמת תיקון השגיאות שנבחרה. קצרו אותו, או עברו לרמה נמוכה יותר.',
      };
    }
  }, [options]);

  const buildWith = useCallback(
    (value: string, frameText?: string | null): QrGeometry => buildGeometry(optionsFor(value, frameText)),
    [optionsFor],
  );

  /**
   * תצוגה מקדימה קטנה לגלריה — תמיד עם ההגדרות המקוריות של העיצוב.
   *
   * ערך דוגמה קצר וקבוע, ולא התוכן של המשתמש. הגלריה מציגה חמישה-עשר ריבועים
   * בגודל אגודל, ובגודל הזה תוכן ארוך אינו נראה שונה — אבל הוא כן עולה: תוכן
   * של 600 תווים הפך את פתיחת הגלריה ל-644 מילישניות של עבודה סינכרונית ועוד
   * חמישה-עשר מסמכי SVG במגה-בייט כל אחד. זה היה הלאג בהחלפת עיצוב.
   *
   * ערך קבוע גם עושה את ההשוואה הוגנת: כל התבניות מציגות את אותה מטריצה,
   * ולכן ההבדל שרואים הוא ההבדל בעיצוב.
   */
  const buildPreview = useCallback((previewDesign: QrDesign): QrGeometry | null => {
    try {
      return buildGeometry({
        value: PREVIEW_VALUE,
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
  }, []);

  /*
    שמירת העדפות — לא כולל הקלט עצמו, שנשמר בהיסטוריה בנפרד.

    מושהית: `localStorage.setItem` הוא כתיבה סינכרונית שחוסמת את התהליך הראשי,
    והאפקט תלוי בכל אובייקט המצב — כלומר כל תו שהוקלד גרר סריאליזציה וכתיבה
    לדיסק. ההשהיה מאחדת רצף הקלדה לכתיבה אחת.
  */
  useEffect(() => {
    const timer = setTimeout(
      () =>
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
        }),
      400,
    );
    return () => clearTimeout(timer);
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
    capacity: Math.min(1, bytes / MAX_BYTES),
    // מעל 80 מודולים כל ריבוע יורד מתחת לחצי מילימטר במדבקה רגילה
    dense: (geometry?.moduleCount ?? 0) > 80,
  };
}
