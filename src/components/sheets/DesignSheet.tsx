import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { QrSvg } from '../QrSvg';
import { Sheet } from '../ui/Sheet';
import { cn } from '@/lib/cn';
import { listItem, listParent, springSnappy } from '@/lib/motion';
import { DESIGNS, DESIGN_TAGS } from '@/lib/qr/presets';
import type { QrDesign, QrGeometry } from '@/lib/qr/types';

interface DesignSheetProps {
  open: boolean;
  onClose: () => void;
  selectedId: string;
  onSelect: (design: QrDesign) => void;
  buildPreview: (design: QrDesign) => QrGeometry | null;
}

export function DesignSheet({
  open,
  onClose,
  selectedId,
  onSelect,
  buildPreview,
}: DesignSheetProps): ReactNode {
  const [tag, setTag] = useState<string | null>(null);
  const visible = useMemo(() => (tag ? DESIGNS.filter((d) => d.tags.includes(tag)) : DESIGNS), [tag]);

  return (
    <Sheet open={open} onClose={onClose} title="עיצוב" subtitle={`${DESIGNS.length} עיצובים מוכנים`}>
      <div className="rail -mx-5 mb-4 flex gap-2 px-5 py-0.5">
        <TagChip active={tag === null} onClick={() => setTag(null)} label="הכול" />
        {DESIGN_TAGS.map((t) => (
          <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} label={t} />
        ))}
      </div>

      <motion.ul
        key={tag ?? 'all'}
        variants={listParent}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3"
      >
        {visible.map((design) => {
          const geo = buildPreview(design);
          const active = design.id === selectedId;
          return (
            <motion.li key={design.id} variants={listItem}>
              <motion.button
                type="button"
                onClick={() => {
                  onSelect(design);
                  onClose();
                }}
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                aria-pressed={active}
                className="w-full text-start"
              >
                <span
                  className={cn(
                    'relative block overflow-hidden rounded-[var(--radius-tile)] border p-2.5 transition-colors',
                    active ? 'border-fg' : 'border-border',
                  )}
                  style={{ background: design.previewBg }}
                >
                  {geo ? (
                    <QrSvg geo={geo} title={design.name} className="w-full" />
                  ) : (
                    <span className="block aspect-square w-full animate-pulse rounded-lg bg-black/10" />
                  )}

                  {active && (
                    <motion.span
                      layoutId="design-check"
                      transition={springSnappy}
                      className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-ink-fg"
                    >
                      <Check size={13} strokeWidth={3} aria-hidden />
                    </motion.span>
                  )}
                </span>

                <span className="mt-2 block truncate px-0.5 text-[0.8125rem] font-semibold">
                  {design.name}
                </span>
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </Sheet>
  );
}

function TagChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): ReactNode {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={springSnappy}
      aria-pressed={active}
      className={cn(
        'h-9 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors',
        active ? 'bg-ink text-ink-fg' : 'bg-surface-2 text-fg-muted hover:text-fg',
      )}
    >
      {label}
    </motion.button>
  );
}
