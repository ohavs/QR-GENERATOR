import { contrastRatio } from '../contrast';
import type { EyeBallShape, EyeFrameShape, ModuleShape, Paint } from './types';

/**
 * הגרלת שילוב עיצוב.
 *
 * ההגרלה מוגבלת בכוונה לתחום שנשאר סָריק: הצבעים נבחרים מזוגות שנבדקו מול
 * סף הניגודיות, וגודל המודול לא יורד מתחת לערך שבו הצורות ה"רזות" מתחילות
 * להיכשל. הגרלה שמייצרת קוד יפה שלא נסרק היא לא פיצ'ר.
 */

const MODULE_SHAPES: ModuleShape[] = [
  'square',
  'rounded',
  'dot',
  'diamond',
  'classy',
  'fluid',
  'vbars',
  'hbars',
  'star',
  'plus',
];

const EYE_FRAMES: EyeFrameShape[] = ['square', 'rounded', 'circle', 'leaf', 'shield', 'cut'];
const EYE_BALLS: EyeBallShape[] = ['square', 'rounded', 'circle', 'diamond', 'leaf', 'flower'];

/** רקעים בהירים, וצבעי קוד כהים ורוויים שעובדים מולם. */
const LIGHT_BACKGROUNDS = ['#FFFFFF', '#FAF7F2', '#F8FAFC', '#FFF7ED', '#FDF4FF', '#F0FDF4'];

const DARK_BODIES = [
  '#0B0B0F',
  '#111827',
  '#1E293B',
  '#4338CA',
  '#5B21B6',
  '#7C3AED',
  '#1D4ED8',
  '#0369A1',
  '#0F766E',
  '#047857',
  '#065F46',
  '#B45309',
  '#C2410C',
  '#BE185D',
  '#9F1239',
  '#B91C1C',
];

/** רקעים כהים, וצבעי קוד בהירים שעובדים מולם. */
const DARK_BACKGROUNDS = ['#000000', '#09090B', '#0B1120', '#0F172A', '#111111', '#0C4A6E'];

const LIGHT_BODIES = [
  '#FFFFFF',
  '#F8FAFC',
  '#E0F2FE',
  '#A7F3D0',
  '#FDE68A',
  '#D4AF37',
  '#7DD3FC',
  '#A78BFA',
  '#34D399',
  '#22D3EE',
];

/** גודל מודול — לא יורד מתחת ל-0.85 כדי שהצורות ה"רזות" יישארו כהות מספיק. */
const DOT_SCALES = [0.85, 0.9, 0.95, 1, 1];
const CORNER_RADII = [0, 0.07, 0.07, 0.15, 0.26];

export interface ShuffleResult {
  moduleShape: ModuleShape;
  eyeFrame: EyeFrameShape;
  eyeBall: EyeBallShape;
  dotScale: number;
  cornerRadius: number;
  bodyOverride: Paint;
  backgroundOverride: Paint;
}

type Rng = () => number;

const pick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/**
 * בונה צביעה לגוף הקוד — לפעמים גרדיאנט בין שני צבעים קרובים.
 *
 * שתי העצירות נבחרות מאותה רשימה ונבדקות שתיהן מול הרקע, כי הסורק ממיר את
 * הפריים לבהירות: עצירה אחת בהירה מדי שוברת את הקוד גם אם השנייה מושלמת.
 */
function bodyPaint(colors: readonly string[], background: string, rng: Rng): Paint {
  const readable = colors.filter((color) => contrastRatio(color, background) >= 4.5);
  const palette = readable.length ? readable : colors;

  const first = pick(palette, rng);
  if (rng() < 0.45 && palette.length > 1) {
    const second = pick(
      palette.filter((c) => c !== first),
      rng,
    );
    return {
      type: 'linear',
      angle: pick([0, 45, 90, 135], rng),
      stops: [
        { offset: 0, color: first },
        { offset: 1, color: second },
      ],
    };
  }
  return { type: 'solid', color: first };
}

/** מגריל שילוב שלם. `rng` ניתן להזרקה כדי שהבדיקות יהיו דטרמיניסטיות. */
export function shuffleDesign(rng: Rng = Math.random): ShuffleResult {
  const dark = rng() < 0.35;
  const background = dark ? pick(DARK_BACKGROUNDS, rng) : pick(LIGHT_BACKGROUNDS, rng);
  const bodies = dark ? LIGHT_BODIES : DARK_BODIES;

  return {
    moduleShape: pick(MODULE_SHAPES, rng),
    eyeFrame: pick(EYE_FRAMES, rng),
    eyeBall: pick(EYE_BALLS, rng),
    dotScale: pick(DOT_SCALES, rng),
    cornerRadius: pick(CORNER_RADII, rng),
    bodyOverride: bodyPaint(bodies, background, rng),
    backgroundOverride: { type: 'solid', color: background },
  };
}
