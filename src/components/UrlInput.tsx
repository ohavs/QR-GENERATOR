import { ClipboardPaste, Info, Link2, X } from 'lucide-react';
import { useCallback, useRef, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { cn } from '@/lib/cn';

/** התו החזק הראשון הוא עברי/ערבי — כלומר הטקסט עצמו RTL. */
function isRtlText(value: string): boolean {
  const strong = value.match(/[\p{Script=Hebrew}\p{Script=Arabic}A-Za-z]/u);
  return !!strong && /[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(strong[0]);
}

interface UrlInputProps {
  value: string;
  onChange: (v: string) => void;
  note: string | null;
  error: string | null;
}

export function UrlInput({ value, onChange, note, error }: UrlInputProps): ReactNode {
  const ref = useRef<HTMLInputElement>(null);

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
      ref.current?.focus();
    } catch {
      // אין הרשאת גישה ללוח — המשתמש תמיד יכול להדביק ידנית
      ref.current?.focus();
    }
  }, [onChange]);

  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;

  return (
    <div className="space-y-2">
      <label htmlFor="qr-value" className="sr-only">
        הקישור או הטקסט לקידוד
      </label>

      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-2xl border bg-surface ps-3 pe-2 shadow-[var(--shadow-md)]',
          'transition-[border-color,box-shadow] duration-200',
          error ? 'border-danger' : 'border-border focus-within:border-primary',
        )}
      >
        <Link2 size={19} className="shrink-0 text-fg-subtle" aria-hidden />
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
          placeholder="הדביקו קישור, למשל  example.co.il"
          aria-invalid={!!error}
          aria-describedby={note || error ? 'qr-value-note' : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-right text-base font-medium outline-none placeholder:font-normal placeholder:text-fg-subtle sm:h-16 sm:text-lg"
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange('');
              ref.current?.focus();
            }}
            aria-label="ניקוי השדה"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} aria-hidden />
          </button>
        ) : (
          canPaste && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={paste}
              icon={<ClipboardPaste size={16} />}
              className="shrink-0"
            >
              <span className="hidden sm:inline">הדבקה</span>
            </Button>
          )
        )}
      </div>

      {(note || error) && (
        <p
          id="qr-value-note"
          className={cn(
            'flex items-start gap-1.5 px-1 text-xs leading-relaxed',
            error ? 'text-danger' : 'text-fg-muted',
          )}
        >
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error ?? note}</span>
        </p>
      )}
    </div>
  );
}
