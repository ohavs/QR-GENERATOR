import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Paint } from '@/lib/qr/types';

const SOLIDS = [
  '#0F172A',
  '#334155',
  '#7C3AED',
  '#4338CA',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#65A30D',
  '#D97706',
  '#DC2626',
  '#DB2777',
  '#111111',
  '#FFFFFF',
  '#FAF7F2',
  '#F1F5F9',
  '#FEF3C7',
];

const GRADIENTS: Array<{ label: string; paint: Paint }> = [
  {
    label: 'סגול-אינדיגו',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#7C3AED' }, { offset: 1, color: '#4338CA' }] },
  },
  {
    label: 'ציאן-סגול',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#22D3EE' }, { offset: 1, color: '#A78BFA' }] },
  },
  {
    label: 'שקיעה',
    paint: { type: 'linear', angle: 0, stops: [{ offset: 0, color: '#F97316' }, { offset: 1, color: '#EC4899' }] },
  },
  {
    label: 'אמרלד',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#10B981' }, { offset: 1, color: '#047857' }] },
  },
  {
    label: 'זהב',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#FDE68A' }, { offset: 1, color: '#D4AF37' }] },
  },
  {
    label: 'אוקיינוס',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#0EA5E9' }, { offset: 1, color: '#1E3A8A' }] },
  },
  {
    label: 'זוהר',
    paint: {
      type: 'radial',
      stops: [
        { offset: 0, color: '#34D399' },
        { offset: 0.5, color: '#22D3EE' },
        { offset: 1, color: '#818CF8' },
      ],
    },
  },
  {
    label: 'דובדבן',
    paint: { type: 'linear', angle: 135, stops: [{ offset: 0, color: '#F43F5E' }, { offset: 1, color: '#7C3AED' }] },
  },
];

/** תצוגת CSS של צביעה — לשימוש בכפתורי בחירה ובתגי צבע. */
export function paintToCss(paint: Paint | null): string {
  if (!paint) return 'transparent';
  if (paint.type === 'solid') return paint.color;
  const stops = paint.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
  return paint.type === 'linear'
    ? `linear-gradient(${90 - paint.angle}deg, ${stops})`
    : `radial-gradient(circle, ${stops})`;
}

function samePaint(a: Paint | null, b: Paint | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface PaintPickerProps {
  label: string;
  value: Paint;
  onChange: (paint: Paint) => void;
  /** האם להציע גם גרדיאנטים */
  allowGradient?: boolean;
}

export function PaintPicker({
  label,
  value,
  onChange,
  allowGradient = true,
}: PaintPickerProps): ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentSolid = value.type === 'solid' ? value.color : '#7C3AED';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-11 w-full items-center gap-2.5 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 text-start transition-colors hover:border-border-strong"
      >
        <span
          className="h-6 w-6 shrink-0 rounded-lg border border-black/10 shadow-inner"
          style={{ background: paintToCss(value) }}
          aria-hidden
        />
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-fg-subtle transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="animate-pop absolute inset-x-0 top-[calc(100%+8px)] z-50 space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)]"
        >
          <div>
            <p className="mb-2 text-xs font-semibold text-fg-muted">צבע מלא</p>
            <div className="grid grid-cols-8 gap-1.5">
              {SOLIDS.map((color) => {
                const active = value.type === 'solid' && value.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => onChange({ type: 'solid', color })}
                    className={cn(
                      'relative aspect-square rounded-lg border transition-transform duration-150 hover:scale-110',
                      active ? 'border-primary ring-2 ring-primary/40' : 'border-black/10',
                    )}
                    style={{ background: color }}
                  >
                    {active && (
                      <Check
                        size={12}
                        className="absolute inset-0 m-auto mix-blend-difference text-white"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 text-sm font-medium">
            <input
              type="color"
              value={currentSolid}
              onChange={(e) => onChange({ type: 'solid', color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="flex-1">צבע מותאם אישית</span>
            <span className="font-mono text-xs uppercase text-fg-subtle">{currentSolid}</span>
          </label>

          {allowGradient && (
            <div>
              <p className="mb-2 text-xs font-semibold text-fg-muted">גרדיאנט</p>
              <div className="grid grid-cols-4 gap-1.5">
                {GRADIENTS.map((g) => {
                  const active = samePaint(value, g.paint);
                  return (
                    <button
                      key={g.label}
                      type="button"
                      title={g.label}
                      aria-label={g.label}
                      onClick={() => onChange(g.paint)}
                      className={cn(
                        'relative aspect-square rounded-lg border transition-transform duration-150 hover:scale-110',
                        active ? 'border-primary ring-2 ring-primary/40' : 'border-black/10',
                      )}
                      style={{ background: paintToCss(g.paint) }}
                    >
                      {active && (
                        <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
