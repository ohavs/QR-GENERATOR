import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { springSnappy } from '@/lib/motion';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps): ReactNode {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[30rem] items-center gap-3 px-4">
        <span className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-[0.9375rem] font-bold tracking-tight">QR Studio</span>
        </span>

        <span className="flex-1" />

        <motion.button
          type="button"
          onClick={onToggleTheme}
          whileTap={{ scale: 0.92 }}
          transition={springSnappy}
          aria-label={isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          className="grid h-10 w-10 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={springSnappy}
            className="block"
          >
            {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
          </motion.span>
        </motion.button>
      </div>
    </header>
  );
}

/** סימן המותג — רשת QR מינימלית, מונוכרומטית חוץ מנקודת ההדגשה. */
function LogoMark(): ReactNode {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="8" height="8" rx="2.4" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="2" width="8" height="8" rx="2.4" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="14" width="8" height="8" rx="2.4" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="18" r="4" fill="var(--accent)" />
    </svg>
  );
}
