import { motion } from 'framer-motion';
import { Check, Download, FileText, Move, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardCanvas } from '../cards/CardCanvas';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section } from '../ui/controls';
import { cn } from '@/lib/cn';
import { cardMillimeters, printWidth, renderCard } from '@/lib/cards/render';
import { CARD_TEMPLATES, TEMPLATE_BY_ID } from '@/lib/cards/templates';
import { CARD_FIELDS, type CardState, type FieldKey, type QrElement } from '@/lib/cards/types';
import { download } from '@/lib/export';
import { listItem, listParent, springSnappy } from '@/lib/motion';
import type { QrGeometry } from '@/lib/qr/types';

const QR_SIZES = [
  { value: -8, label: 'קטן יותר' },
  { value: 0, label: 'רגיל' },
  { value: 8, label: 'גדול יותר' },
  { value: 16, label: 'ענק' },
];

interface CardSheetProps {
  open: boolean;
  onClose: () => void;
  geometry: QrGeometry | null;
  state: CardState;
  onChange: (next: CardState) => void;
  onError: (message: string) => void;
  fileName: string;
}

/**
 * מעצב הכרטיסיות.
 *
 * הטופס מבוסס שדות מוכנים ולא על תיבות טקסט חופשיות: מי שמכין כרטיס ביקור
 * חושב במונחי "שם", "טלפון", "תפקיד" — לא במונחי "אלמנט טקסט במיקום 8,20".
 * מיקום הקוד וגודלו נשארים בשליטה ידנית, כי שם באמת יש טעם אישי.
 */
export function CardSheet({
  open,
  onClose,
  geometry,
  state,
  onChange,
  onError,
  fileName,
}: CardSheetProps): ReactNode {
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const template = TEMPLATE_BY_ID.get(state.templateId) ?? CARD_TEMPLATES[0];

  const baseQr = useMemo(
    () => template.elements.find((e): e is QrElement => e.kind === 'qr'),
    [template],
  );

  const qr = state.qrOverride ??
    (baseQr ? { x: baseQr.x, y: baseQr.y, size: baseQr.size } : { x: 60, y: 25, size: 30 });

  const setQr = useCallback(
    (next: Partial<typeof qr>) => {
      onChange({ ...state, qrOverride: { ...qr, ...next } });
    },
    [onChange, state, qr],
  );

  const setField = useCallback(
    (key: FieldKey, value: string) => {
      onChange({ ...state, values: { ...state.values, [key]: value } });
    },
    [onChange, state],
  );

  /** גרירת הקוד: המרת תזוזה בפיקסלים לאחוזים מרוחב הכרטיס. */
  const handleDrag = useCallback(
    (deltaX: number, deltaY: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const unit = stage.clientWidth / 100;
      const heightPercent = (stage.clientHeight / stage.clientWidth) * 100;

      onChange({
        ...state,
        qrOverride: {
          ...qr,
          // הצמדה לגבולות הכרטיס — קוד שגולש החוצה נחתך בהדפסה
          x: Math.max(0, Math.min(100 - qr.size, qr.x + deltaX / unit)),
          y: Math.max(0, Math.min(heightPercent - qr.size, qr.y + deltaY / unit)),
        },
      });
    },
    [onChange, state, qr],
  );

  const exportCard = useCallback(
    async (format: 'png' | 'pdf') => {
      if (!geometry) return;
      setBusy(format);
      try {
        const canvas = await renderCard(template, state.values, geometry, state.qrOverride, {
          width: printWidth(template),
        });

        if (format === 'png') {
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png'),
          );
          if (!blob) throw new Error('יצירת התמונה נכשלה');
          download(blob, `${fileName}-card.png`);
        } else {
          const { canvasToPdf } = await import('@/lib/pdf');
          const blob = await canvasToPdf(canvas, {
            ...cardMillimeters(template),
            title: state.values.name || template.name,
          });
          download(blob, `${fileName}-card.pdf`);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'הייצוא נכשל');
      } finally {
        setBusy(null);
      }
    },
    [geometry, template, state, fileName, onError],
  );

  const visibleFields = CARD_FIELDS.filter(
    (field) => template.usesFields.includes(field.key) || state.values[field.key],
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="כרטיסייה מעוצבת"
      subtitle={`${template.widthMm}×${template.heightMm} מ״מ · מוכן להדפסה`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="ink"
            size="lg"
            block
            disabled={!geometry}
            loading={busy === 'pdf'}
            onClick={() => void exportCard('pdf')}
            icon={<FileText size={18} />}
          >
            הורדת PDF
          </Button>
          <Button
            variant="soft"
            size="lg"
            disabled={!geometry}
            loading={busy === 'png'}
            onClick={() => void exportCard('png')}
            icon={<Download size={18} />}
            className="shrink-0 px-4"
          >
            PNG
          </Button>
        </div>
      }
    >
      {/* ── תצוגה חיה עם ידית גרירה לקוד ────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3 pt-1">
        <div ref={stageRef} className="relative">
          <CardCanvas
            template={template}
            values={state.values}
            geometry={geometry}
            qrOverride={state.qrOverride}
          />

          {geometry && (
            <motion.button
              type="button"
              drag
              dragMomentum={false}
              dragElastic={0}
              onDrag={(_, info) => handleDrag(info.delta.x, info.delta.y)}
              onDragEnd={() => undefined}
              whileDrag={{ scale: 1.04 }}
              transition={springSnappy}
              aria-label="גרירת הקוד למיקום אחר"
              className="absolute cursor-grab rounded-lg border-2 border-dashed border-accent/0 transition-colors hover:border-accent/70 active:cursor-grabbing"
              style={{
                left: `${qr.x}%`,
                top: `${(qr.y * template.widthMm) / template.heightMm}%`,
                width: `${qr.size}%`,
                height: `${(qr.size * template.widthMm) / template.heightMm}%`,
                // הגרירה משנה את המצב ולא את מיקום האלמנט — התמונה עצמה מצוירת מחדש
                transform: 'none',
              }}
            >
              <span className="pointer-events-none absolute -top-2 end-1/2 translate-x-1/2 rounded-full bg-accent px-1.5 py-0.5 text-[0.5625rem] font-bold text-accent-fg opacity-0 transition-opacity group-hover:opacity-100">
                <Move size={9} aria-hidden />
              </span>
            </motion.button>
          )}
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.6875rem] text-fg-subtle">
          <Move size={11} aria-hidden />
          אפשר לגרור את הקוד למקום אחר
        </p>
      </div>

      {/* ── תבניות ────────────────────────────────────────────── */}
      <Section title="תבנית">
        <motion.div
          variants={listParent}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2.5"
        >
          {CARD_TEMPLATES.map((option) => {
            const active = option.id === template.id;
            return (
              <motion.button
                key={option.id}
                variants={listItem}
                type="button"
                onClick={() => onChange({ ...state, templateId: option.id, qrOverride: null })}
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                aria-pressed={active}
                className="text-start"
              >
                <span
                  className={cn(
                    'relative block overflow-hidden rounded-[var(--radius-control)] border-2 transition-colors',
                    active ? 'border-fg' : 'border-transparent',
                  )}
                >
                  <CardCanvas
                    template={option}
                    values={state.values}
                    geometry={geometry}
                    qrOverride={null}
                    width={420}
                  />
                  {active && (
                    <span className="absolute end-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-ink-fg">
                      <Check size={11} strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate px-0.5 text-[0.8125rem] font-semibold">
                  {option.name}
                </span>
                <span className="block truncate px-0.5 text-[0.6875rem] text-fg-subtle">
                  {option.blurb}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </Section>

      <Divider />

      {/* ── תוכן ──────────────────────────────────────────────── */}
      <Section title="תוכן">
        <div className="space-y-2.5">
          {visibleFields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block px-1 text-[0.75rem] font-semibold text-fg-muted">
                {field.label}
              </span>
              <input
                type="text"
                dir={field.dir === 'ltr' ? 'ltr' : 'auto'}
                value={state.values[field.key] ?? ''}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-right text-[0.875rem] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-fg-subtle focus:border-fg"
              />
            </label>
          ))}
        </div>

        {visibleFields.length < CARD_FIELDS.length && (
          <div className="rail -mx-5 flex gap-2 px-5 pt-1">
            {CARD_FIELDS.filter((f) => !visibleFields.includes(f)).map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setField(field.key, ' ')}
                className="h-9 shrink-0 rounded-full bg-surface-2 px-3.5 text-[0.75rem] font-semibold text-fg-muted transition-colors hover:text-fg"
              >
                + {field.label}
              </button>
            ))}
          </div>
        )}
      </Section>

      <Divider />

      {/* ── גודל הקוד ─────────────────────────────────────────── */}
      <Section title="גודל הקוד">
        <Pills
          label="גודל הקוד"
          layout="grid"
          columns={4}
          options={QR_SIZES.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={
            QR_SIZES.reduce((best, option) =>
              Math.abs((baseQr?.size ?? 30) + option.value - qr.size) <
              Math.abs((baseQr?.size ?? 30) + best.value - qr.size)
                ? option
                : best,
            ).value
          }
          onChange={(delta) => setQr({ size: Math.max(12, Math.min(70, (baseQr?.size ?? 30) + delta)) })}
        />

        {state.qrOverride && (
          <Button
            variant="ghost"
            size="sm"
            block
            icon={<RotateCcw size={14} />}
            onClick={() => onChange({ ...state, qrOverride: null })}
          >
            החזרת הקוד למיקום שבתבנית
          </Button>
        )}
      </Section>
    </Sheet>
  );
}
