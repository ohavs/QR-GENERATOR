import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet } from '../ui/Sheet';
import { cn } from '@/lib/cn';
import { listItem, listParent, springSnappy } from '@/lib/motion';
import { SIZES, SIZE_GROUPS, type SizeGroup, type SizePreset } from '@/lib/sizes';

const GROUP_ORDER: SizeGroup[] = ['digital', 'print', 'social'];

interface SizeSheetProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (size: SizePreset) => void;
}

export function SizeSheet({ open, onClose, value, onChange }: SizeSheetProps): ReactNode {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="גודל"
      subtitle="כל העיצובים וקטוריים ונשארים חדים בכל גודל"
    >
      <motion.div variants={listParent} initial="hidden" animate="show" className="space-y-5">
        {GROUP_ORDER.map((group) => (
          <motion.section key={group} variants={listItem} className="space-y-2.5">
            <h3 className="text-[0.8125rem] font-bold">{SIZE_GROUPS[group]}</h3>

            <div className="overflow-hidden rounded-[var(--radius-tile)] border border-border [&>*+*]:border-t [&>*+*]:border-border">
              {SIZES.filter((s) => s.group === group).map((size) => {
                const active = size.id === value;
                return (
                  <motion.button
                    key={size.id}
                    type="button"
                    onClick={() => {
                      onChange(size);
                      onClose();
                    }}
                    whileTap={{ scale: 0.99 }}
                    transition={springSnappy}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-start transition-colors',
                      active ? 'bg-surface-2' : 'hover:bg-surface-2',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">
                        {size.label}
                      </span>
                      <span className="block truncate text-[0.8125rem] text-fg-muted">
                        {size.hint}
                      </span>
                    </span>

                    {active && (
                      <motion.span
                        layoutId="size-check"
                        transition={springSnappy}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-ink-fg"
                      >
                        <Check size={13} strokeWidth={3} aria-hidden />
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        ))}
      </motion.div>
    </Sheet>
  );
}
