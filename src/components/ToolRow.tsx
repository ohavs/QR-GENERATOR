import { motion } from 'framer-motion';
import { IdCard, Layers, Link2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';

export type ToolName = 'card' | 'batch' | 'dynamic';

interface ToolRowProps {
  onOpen: (tool: ToolName) => void;
  /** קוד דינמי פעיל — הפריט מסומן כדי שיהיה ברור שהקוד מצביע על כתובת קצרה */
  dynamicActive: boolean;
}

const TOOLS: Array<{ id: ToolName; label: string; icon: typeof IdCard }> = [
  { id: 'card', label: 'כרטיסייה', icon: IdCard },
  { id: 'batch', label: 'אצווה', icon: Layers },
  { id: 'dynamic', label: 'קוד דינמי', icon: Link2 },
];

/**
 * שלוש הפעולות שמייצרות משהו מעבר לקוד עצמו.
 *
 * הן ישבו בתחתית רשימת ההגדרות, בין "גודל" ל"צבעים" — כלומר נראו כמו עוד
 * שתי הגדרות של הקוד, ולא כמו מה שהן: מסלולים נפרדים שמייצרים כרטיס, גיליון
 * או קוד שניתן לערוך אחרי הדפסה. כאן הן מקבלות את השורה העליונה, שהתפנתה
 * כשבורר סוג התוכן הפך לרשימה נפתחת.
 */
export function ToolRow({ onOpen, dynamicActive }: ToolRowProps): ReactNode {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = tool.id === 'dynamic' && dynamicActive;
        return (
          <motion.button
            key={tool.id}
            type="button"
            onClick={() => onOpen(tool.id)}
            whileTap={{ scale: 0.96 }}
            transition={springSnappy}
            className={cn(
              'flex h-11 items-center justify-center gap-1.5 rounded-full border px-2 transition-colors',
              'text-[0.8125rem] font-semibold',
              active
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
            )}
          >
            <Icon size={15} className="shrink-0" aria-hidden />
            <span className="truncate">{tool.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
