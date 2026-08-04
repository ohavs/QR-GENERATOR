import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardPaste, Link2, X } from 'lucide-react';
import { useCallback, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { fade, springSnappy } from '@/lib/motion';

/** התו החזק הראשון הוא עברי/ערבי — כלומר הטקסט עצמו RTL. */
function isRtlText(value: string): boolean {
  const strong = value.match(/[\p{Script=Hebrew}\p{Script=Arabic}A-Za-z]/u);
  return !!strong && /[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(strong[0]);
}

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  note: string | null;
  error: string | null;
}

export function UrlInput({ value, onChange, note, error }: UrlInputProps): ReactNode {
  const ref = useRef<HTMLInputElement>(null);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      // אין הרשאת גישה ללוח — המשתמש תמיד יכול להדביק ידנית
    }
    ref.current?.focus();
  }, [onChange]);

  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  return (
    <div>
      <label htmlFor="qr-value" className="sr-only">
        הקישור או הטקסט לקידוד
      </label>

      <div
        className={cn(
          'flex h-14 items-center gap-2.5 rounded-full bg-surface ps-4 pe-2',
          'border transition-colors duration-200',
          error ? 'border-danger' : 'border-border focus-within:border-fg',
        )}
      >
        <Link2 size={18} className="shrink-0 text-fg-subtle" aria-hidden />

        <input
          ref={ref}
          id="qr-value"
          type="text"
          inputMode="url"
          autoComplete="url"
          // כיוון לפי התוכן: כתובת נשארת LTR כדי שסלאשים ונקודות לא יקפצו,
          // אבל היישור תמיד לצד ההתחלה של ממשק RTL.
          dir={isRtlText(value) ? 'rtl' : 'ltr'}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="הדביקו קישור"
          aria-invalid={!!error}
          aria-describedby={note || error ? 'qr-value-note' : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-right text-[0.9375rem] font-medium outline-none placeholder:font-normal placeholder:text-fg-subtle"
        />

        <AnimatePresence mode="wait" initial={false}>
          {value ? (
            <motion.button
              key="clear"
              type="button"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={springSnappy}
              onClick={() => {
                onChange('');
                ref.current?.focus();
              }}
              aria-label="ניקוי השדה"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X size={17} aria-hidden />
            </motion.button>
          ) : (
            canPaste && (
              <motion.button
                key="paste"
                type="button"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                whileTap={{ scale: 0.94 }}
                transition={springSnappy}
                onClick={paste}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[0.8125rem] font-semibold text-fg-muted transition-colors hover:text-fg"
              >
                <ClipboardPaste size={15} aria-hidden />
                הדבקה
              </motion.button>
            )
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(note || error) && (
          <motion.p
            id="qr-value-note"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={fade}
            className={cn(
              'overflow-hidden px-4 text-xs leading-relaxed',
              error ? 'text-danger' : 'text-fg-muted',
            )}
          >
            <span className="block pt-2">{error ?? note}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
