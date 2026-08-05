import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardPaste, Info, X } from 'lucide-react';
import { useCallback, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EASE_OUT, fade, springSnappy } from '@/lib/motion';
import {
  CONTENT_TYPES,
  type ContentKind,
  type FieldSpec,
  type FieldValues,
} from '@/lib/qr/content';
import { KindPicker } from './KindPicker';

/** התו החזק הראשון הוא עברי/ערבי — כלומר הטקסט עצמו RTL. */
function isRtlText(value: string): boolean {
  const strong = value.match(/[\p{Script=Hebrew}\p{Script=Arabic}A-Za-z]/u);
  return !!strong && /[\p{Script=Hebrew}\p{Script=Arabic}]/u.test(strong[0]);
}

interface ContentInputProps {
  kind: ContentKind;
  values: FieldValues;
  onKindChange: (kind: ContentKind) => void;
  onFieldChange: (name: string, value: string) => void;
  note: string | null;
  error: string | null;
}

export function ContentInput({
  kind,
  values,
  onKindChange,
  onFieldChange,
  note,
  error,
}: ContentInputProps): ReactNode {
  const type = CONTENT_TYPES[kind];

  return (
    <div className="space-y-3">
      <KindPicker kind={kind} onChange={onKindChange} />

      {/* הטופס עצמו — מוחלף עם מעבר קצר, כדי שיהיה ברור שהמסך התחלף */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={kind}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className={cn(type.fields.length > 1 && 'grid grid-cols-2 gap-2.5')}
        >
          {type.fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              onChange={(v) => onFieldChange(field.name, v)}
              solo={type.fields.length === 1}
              invalid={!!error && !!field.required}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* השגיאה עצמה מוצגת בתצוגה המקדימה, במקום שבו הקוד היה אמור להופיע.
          כאן היא רק צובעת את השדה החסר — הודעה כפולה על אותו מסך היא רעש. */}
      <AnimatePresence>
        {note && !error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={fade}
            className={cn(
              'flex items-start gap-1.5 overflow-hidden px-1 text-xs leading-relaxed text-fg-muted',
            )}
          >
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
            <span>{note}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface FieldProps {
  field: FieldSpec;
  value: string;
  onChange: (value: string) => void;
  /** שדה יחיד בטופס — מקבל טיפול מוגדל עם כפתור הדבקה */
  solo: boolean;
  invalid: boolean;
}

function Field({ field, value, onChange, solo, invalid }: FieldProps): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  const id = `content-${field.name}`;

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text.trim());
    } catch {
      // אין הרשאת גישה ללוח — אפשר תמיד להדביק ידנית
    }
    ref.current?.focus();
  }, [onChange]);

  const canPaste = solo && typeof navigator !== 'undefined' && !!navigator.clipboard?.readText;
  const dir = field.dir === 'auto' ? (isRtlText(value) ? 'rtl' : 'ltr') : (field.dir ?? 'rtl');

  const shell = cn(
    'flex items-center gap-2 rounded-2xl border bg-surface px-3.5 transition-colors duration-200',
    invalid && !value ? 'border-danger' : 'border-border focus-within:border-fg',
    solo ? 'h-14 rounded-full' : 'h-12',
  );

  /*
    בחירה מוצגת כקבוצת אפשרויות פרושה ולא כתפריט נפתח.

    `<select>` פותח רכיב של מערכת ההפעלה — גופן אחר, צבעים אחרים, וכיוון שגוי
    בחלק ממכשירי אנדרואיד. גם כשמעצבים את התיבה הסגורה, הרשימה שנפתחת נשארת
    זרה לאפליקציה. שתיים-שלוש אפשרויות ממילא נכנסות לשורה אחת.
  */
  if (field.type === 'select') {
    const options = field.options ?? [];
    const current = value || options[0]?.value || '';

    /*
      תמיד ברוחב מלא, גם כששאר השדות בשורה חצויה.

      בחירה פרושה צריכה מקום לכל האפשרויות; דחיסה לחצי רוחב טלפון קיצצה את
      התוויות באמצע. `min-w-0` חובה כאן — ל-fieldset יש רוחב מינימלי מובנה
      שמונע ממנו להתכווץ בתוך רשת, והוא גולש החוצה במקום להצטמצם.
    */
    return (
      <fieldset className="col-span-2 block min-w-0">
        <legend className="mb-1.5 px-1 text-[0.75rem] font-semibold text-fg-muted">
          {field.label}
        </legend>
        <div
          role="radiogroup"
          aria-label={field.label}
          className="flex h-12 items-center gap-1 rounded-2xl border border-border bg-surface p-1"
        >
          {options.map((option) => {
            const active = option.value === current;
            return (
              <motion.button
                key={option.value || 'empty'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(option.value)}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                className={cn(
                  'relative h-full min-w-0 flex-1 rounded-[0.875rem] px-2',
                  'text-[0.8125rem] font-semibold transition-colors duration-200',
                  active ? 'text-ink-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${id}-choice`}
                    transition={springSnappy}
                    className="absolute inset-0 rounded-[0.875rem] bg-ink"
                    aria-hidden
                  />
                )}
                <span className="relative block truncate">{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className={cn('block', field.half ? 'col-span-1' : 'col-span-2')} htmlFor={id}>
        {!solo && (
          <span className="mb-1.5 block px-1 text-[0.75rem] font-semibold text-fg-muted">
            {field.label}
          </span>
        )}
        <textarea
          id={id}
          rows={solo ? 4 : 3}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-label={solo ? field.label : undefined}
          className={cn(
            'w-full resize-none rounded-2xl border bg-surface p-3.5 text-[0.9375rem] font-medium outline-none transition-colors',
            'placeholder:font-normal placeholder:text-fg-subtle',
            invalid && !value ? 'border-danger' : 'border-border focus:border-fg',
            dir === 'rtl' ? 'text-right' : 'text-left',
          )}
        />
        {field.hint && <span className="mt-1 block px-1 text-xs text-fg-subtle">{field.hint}</span>}
      </label>
    );
  }

  return (
    <div className={cn(field.half ? 'col-span-1' : 'col-span-2')}>
      {!solo && (
        <label htmlFor={id} className="mb-1.5 block px-1 text-[0.75rem] font-semibold text-fg-muted">
          {field.label}
        </label>
      )}
      <div className={shell}>
        <input
          ref={ref}
          id={id}
          type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
          inputMode={field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : undefined}
          // כיוון לפי התוכן: כתובות ומספרים נשארים LTR כדי שסימני פיסוק לא יקפצו,
          // אבל היישור תמיד לצד ההתחלה של ממשק RTL.
          dir={dir}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          aria-label={solo ? field.label : undefined}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent text-right font-medium outline-none',
            'placeholder:font-normal placeholder:text-fg-subtle',
            solo ? 'text-[0.9375rem]' : 'text-[0.875rem]',
          )}
        />

        {solo && value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springSnappy}
            onClick={() => {
              onChange('');
              ref.current?.focus();
            }}
            aria-label="ניקוי השדה"
            className="-me-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={16} aria-hidden />
          </motion.button>
        )}

        {canPaste && !value && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={springSnappy}
            onClick={paste}
            className="-me-1.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[0.8125rem] font-semibold text-fg-muted transition-colors hover:text-fg"
          >
            <ClipboardPaste size={14} aria-hidden />
            הדבקה
          </motion.button>
        )}
      </div>
      {field.hint && <p className="mt-1 px-1 text-xs text-fg-subtle">{field.hint}</p>}
    </div>
  );
}
