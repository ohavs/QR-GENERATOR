import { Download, Moon, Share, Sun } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { track } from '@/lib/firebase';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import type { ThemeMode } from '@/hooks/useTheme';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  mode: ThemeMode;
}

export function Header({ isDark, onToggleTheme, mode }: HeaderProps): ReactNode {
  const { canInstall, iosHint, install } = useInstallPrompt();
  const [showIosHint, setShowIosHint] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5" aria-label="QR Studio — לדף הראשי">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl shadow-[var(--shadow-md)]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4338CA)' }}
            aria-hidden
          >
            <LogoMark />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-extrabold tracking-tight">QR Studio</span>
            <span className="mt-0.5 text-[11px] font-medium text-fg-subtle">
              קודי QR מעוצבים בשניות
            </span>
          </span>
        </a>

        <div className="flex-1" />

        {canInstall && (
          <Button
            size="sm"
            variant="outline"
            icon={<Download size={15} />}
            onClick={async () => {
              const accepted = await install();
              if (accepted) void track('pwa_installed');
            }}
          >
            <span className="hidden sm:inline">התקנה</span>
          </Button>
        )}

        {iosHint && (
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              icon={<Share size={15} />}
              onClick={() => setShowIosHint((v) => !v)}
              aria-expanded={showIosHint}
            >
              <span className="hidden sm:inline">התקנה</span>
            </Button>
            {showIosHint && (
              <p className="animate-pop absolute end-0 top-[calc(100%+8px)] w-60 rounded-2xl border border-border bg-surface p-3 text-xs leading-relaxed shadow-[var(--shadow-lg)]">
                להתקנה באייפון: הקישו על כפתור השיתוף בסרגל ספארי, ואז על{' '}
                <strong>״הוספה למסך הבית״</strong>.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onToggleTheme();
            void track('theme_toggled', { to: isDark ? 'light' : 'dark' });
          }}
          aria-label={isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה'}
          title={mode === 'system' ? 'עוקב אחרי הגדרת המערכת' : undefined}
          className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          {isDark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
        </button>
      </div>
    </header>
  );
}

function LogoMark(): ReactNode {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h6v6H4V4Zm2 2v2h2V6H6Zm8-2h6v6h-6V4Zm2 2v2h2V6h-2ZM4 14h6v6H4v-6Zm2 2v2h2v-2H6Z"
        fill="#fff"
      />
      <path d="M14 14h2.5v2.5H14V14Zm3.5 0H20v2.5h-2.5V14ZM14 17.5h2.5V20H14v-2.5Zm3.5 0H20V20h-2.5v-2.5Z" fill="#fff" opacity=".9" />
    </svg>
  );
}
