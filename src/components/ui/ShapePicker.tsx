import { motion } from 'framer-motion';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { eyeBallGlyph, eyeFrameGlyph, moduleSample } from '@/lib/qr/geometry';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import type { Choice } from '@/lib/qr/options';
import type { EyeBallShape, EyeFrameShape, ModuleShape } from '@/lib/qr/types';

interface ShapePickerProps<T extends string> {
  label: string;
  options: Array<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
  kind: 'module' | 'eyeFrame' | 'eyeBall';
}

/**
 * בחירת צורה לפי מראה ולא לפי שם.
 *
 * "אלכסוני", "זורם" ו"קטום" הם שמות שלא אומרים דבר עד שרואים את התוצאה, וקודם
 * הם הוצגו כטקסט בלבד — כלומר הדרך היחידה להבין מה כל אחד עושה הייתה לבחור
 * את כולם בזה אחר זה. כאן כל אפשרות מציירת את עצמה מאותם בוני נתיבים שמייצרים
 * את הקוד עצמו, ולכן הדוגמית היא בדיוק מה שיתקבל.
 */
export function ShapePicker<T extends string>({
  label,
  options,
  value,
  onChange,
  kind,
}: ShapePickerProps<T>): ReactNode {
  const scrollActiveIntoView = useScrollIntoView<HTMLButtonElement>();

  const glyphs = useMemo(
    () =>
      options.map((option) => {
        if (kind === 'module') {
          return { d: moduleSample(option.value as ModuleShape), box: 3 };
        }
        if (kind === 'eyeFrame') {
          return { d: eyeFrameGlyph(option.value as EyeFrameShape, 0, 0), box: 7 };
        }
        return {
          // גלגל העין מצויר בתוך מסגרת 7×7, ולכן הדוגמית מציגה את אותו חלון
          d: eyeBallGlyph(option.value as EyeBallShape, 0, 0),
          box: 7,
        };
      }),
    [options, kind],
  );

  return (
    <div role="radiogroup" aria-label={label} className="rail -mx-5 flex gap-2 px-5 py-0.5">
      {options.map((option, index) => {
        const active = option.value === value;
        const { d, box } = glyphs[index];
        return (
          <motion.button
            key={option.value}
            ref={active ? scrollActiveIntoView : undefined}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.94 }}
            transition={springSnappy}
            className="flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'grid h-[3.25rem] w-[3.25rem] place-items-center rounded-[var(--radius-control)] border-2 transition-colors',
                active ? 'border-fg bg-surface' : 'border-border bg-surface-2',
              )}
            >
              <svg
                viewBox={`${kind === 'eyeBall' ? 1.6 : 0} ${kind === 'eyeBall' ? 1.6 : 0} ${
                  kind === 'eyeBall' ? 3.8 : box
                } ${kind === 'eyeBall' ? 3.8 : box}`}
                className="h-8 w-8"
                aria-hidden
              >
                <path
                  d={d}
                  fillRule={kind === 'eyeFrame' ? 'evenodd' : 'nonzero'}
                  className={active ? 'fill-fg' : 'fill-fg-muted'}
                />
              </svg>
            </span>
            <span
              className={cn(
                'w-full truncate text-center text-[0.6875rem]',
                active ? 'font-bold text-fg' : 'font-medium text-fg-muted',
              )}
            >
              {option.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
