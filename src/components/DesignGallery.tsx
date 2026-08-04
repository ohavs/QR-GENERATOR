import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { QrSvg } from './QrSvg';
import { cn } from '@/lib/cn';
import { DESIGNS, DESIGN_TAGS } from '@/lib/qr/presets';
import type { QrDesign, QrGeometry } from '@/lib/qr/types';

interface DesignGalleryProps {
  selectedId: string;
  onSelect: (design: QrDesign) => void;
  buildPreview: (design: QrDesign) => QrGeometry | null;
}

export function DesignGallery({ selectedId, onSelect, buildPreview }: DesignGalleryProps): ReactNode {
  const [tag, setTag] = useState<string | null>(null);

  const visible = useMemo(
    () => (tag ? DESIGNS.filter((d) => d.tags.includes(tag)) : DESIGNS),
    [tag],
  );

  return (
    <div className="space-y-4">
      <div className="scroll-fade -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <TagChip active={tag === null} onClick={() => setTag(null)}>
          הכול
        </TagChip>
        {DESIGN_TAGS.map((t) => (
          <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </TagChip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((design, i) => {
          const geo = buildPreview(design);
          const active = design.id === selectedId;
          return (
            <motion.button
              key={design.id}
              type="button"
              onClick={() => onSelect(design)}
              aria-pressed={active}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.34,
                delay: Math.min(i * 0.025, 0.28),
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border bg-surface text-start',
                'transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)]',
                'hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]',
                active
                  ? 'border-primary shadow-[var(--shadow-md)] ring-2 ring-primary/30'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <div
                className="relative grid place-items-center p-3"
                style={{ background: design.previewBg }}
              >
                {geo ? (
                  <QrSvg geo={geo} title={design.name} className="w-full" />
                ) : (
                  <div className="aspect-square w-full animate-pulse rounded-lg bg-black/10" />
                )}

                {active && (
                  <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-fg shadow-md">
                    <Check size={14} strokeWidth={3} aria-hidden />
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1 border-t border-border px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold">{design.name}</h3>
                  {design.tags.includes('מומלץ') && (
                    <Sparkles size={12} className="shrink-0 text-primary" aria-hidden />
                  )}
                </div>
                <p className="line-clamp-2 text-[11px] leading-snug text-fg-subtle">{design.blurb}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-all duration-200',
        active
          ? 'border-primary bg-primary text-primary-fg shadow-[var(--shadow-sm)]'
          : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}
