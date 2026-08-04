import { motion } from 'framer-motion';
import { Check, Pipette } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import type { Paint } from '@/lib/qr/types';

const SOLIDS = [
  '#0B0B0F',
  '#3F3F46',
  '#5B4BFF',
  '#1D4ED8',
  '#0891B2',
  '#047857',
  '#B45309',
  '#BE185D',
  '#B91C1C',
  '#FFFFFF',
];

const GRADIENTS: Array<{ label: string; paint: Paint }> = [
  {
    label: 'סגול־אינדיגו',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#7C3AED' }, { offset: 1, color: '#4338CA' }] },
  },
  {
    label: 'ציאן־סגול',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#0891B2' }, { offset: 1, color: '#6D28D9' }] },
  },
  {
    label: 'שקיעה',
    paint: { type: 'linear', angle: 0, stops: [{ offset: 0, color: '#C2410C' }, { offset: 1, color: '#BE185D' }] },
  },
  {
    label: 'אמרלד',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#047857' }, { offset: 1, color: '#064E3B' }] },
  },
  {
    label: 'אוקיינוס',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#0369A1' }, { offset: 1, color: '#1E3A8A' }] },
  },
  {
    label: 'זוהר',
    paint: {
      type: 'radial',
      stops: [
        { offset: 0, color: '#047857' },
        { offset: 0.5, color: '#0E7490' },
        { offset: 1, color: '#4338CA' },
      ],
    },
  },
];

/** תצוגת CSS של צביעה — לדוגמיות ולתצוגות מוקטנות. */
export function paintToCss(paint: Paint | null): string {
  if (!paint) return 'transparent';
  if (paint.type === 'solid') return paint.color;
  const stops = paint.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return paint.type === 'linear'
    ? `linear-gradient(${90 - paint.angle}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`;
}

const same = (a: Paint | null, b: Paint | null): boolean => JSON.stringify(a) === JSON.stringify(b);

interface ColorFieldProps {
  label: string;
  value: Paint;
  onChange: (paint: Paint) => void;
  allowGradient?: boolean;
}

/**
 * בורר צבע פרוש, לא נפתח.
 *
 * בתוך גיליון אין סיבה להסתיר את הדוגמיות מאחורי תפריט נוסף — הן מוצגות
 * ישירות, בגודל מגע נוח, והבחירה נראית בלי הקשה מקדימה.
 */
export function ColorField({
  label,
  value,
  onChange,
  allowGradient = true,
}: ColorFieldProps): ReactNode {
  const currentSolid = value.type === 'solid' ? value.color : '#5B4BFF';
  const scrollActiveIntoView = useScrollIntoView<HTMLButtonElement>();

  return (
    <div className="space-y-2.5">
      <p className="text-[0.8125rem] font-semibold">{label}</p>

      <div className="rail -mx-5 flex gap-2 px-5 py-0.5">
        {SOLIDS.map((color) => (
          <Swatch
            key={color}
            background={color}
            active={value.type === 'solid' && value.color === color}
            onClick={() => onChange({ type: 'solid', color })}
            label={color}
            activeRef={scrollActiveIntoView}
          />
        ))}

        {allowGradient &&
          GRADIENTS.map((g) => (
            <Swatch
              key={g.label}
              background={paintToCss(g.paint)}
              active={same(value, g.paint)}
              onClick={() => onChange(g.paint)}
              label={g.label}
              activeRef={scrollActiveIntoView}
            />
          ))}

        <label
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-fg-muted"
          title="צבע מותאם אישית"
        >
          <Pipette size={16} aria-hidden />
          <input
            type="color"
            value={currentSolid}
            onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="צבע מותאם אישית"
          />
        </label>
      </div>
    </div>
  );
}

function Swatch({
  background,
  active,
  onClick,
  label,
  activeRef,
}: {
  background: string;
  active: boolean;
  onClick: () => void;
  label: string;
  activeRef?: (node: HTMLButtonElement | null) => void;
}): ReactNode {
  return (
    <motion.button
      ref={active ? activeRef : undefined}
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      transition={springSnappy}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center rounded-full border',
        active ? 'border-fg' : 'border-black/10 dark:border-white/15',
      )}
      style={{ background }}
    >
      {active && (
        <motion.span
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSnappy}
          className="grid h-5 w-5 place-items-center rounded-full bg-white shadow"
        >
          <Check size={12} strokeWidth={3} className="text-black" aria-hidden />
        </motion.span>
      )}
    </motion.button>
  );
}
