import { motion } from 'framer-motion';
import { Check, Download, FileText, Move, RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CardCanvas } from '../cards/CardCanvas';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section } from '../ui/controls';
import { cn } from '@/lib/cn';
import { cardMillimeters, printWidth, renderCard } from '@/lib/cards/render';
import { CARD_GROUPS, CARD_TEMPLATES, TEMPLATE_BY_ID } from '@/lib/cards/templates';
import { FIELD_BY_KEY, type CardState, type FieldKey, type QrElement } from '@/lib/cards/types';
import { download } from '@/lib/export';
import { listItem, listParent, springSnappy } from '@/lib/motion';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import type { QrGeometry } from '@/lib/qr/types';

const QR_SIZES = [
  { value: -8, label: 'קטן' },
  { value: 0, label: 'רגיל' },
  { value: 8, label: 'גדול' },
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
 * הטופס מבוסס שדות מוכנים ולא על תיבות טקסט חופשיות: מי שמכין שלט לדלפק
 * חושב במונחי "כותרת" ו"שם העסק" — לא במונחי "אלמנט טקסט במיקום 8,20".
 * מיקום הקוד וגודלו נשארים בשליטה ידנית, כי שם באמת יש טעם אישי.
 *
 * שדה ריק מצויר כדוגמה שקופה ולא נעלם. תבנית שמאבדת חצי מהעיצוב שלה ברגע
 * שנכנסים אליה נראית שבורה, והמשתמש לא יודע מה בכלל אמור להיות שם — זו
 * בדיוק הסיבה שהגרסה הקודמת הרגישה כאילו "לא קורה כלום".
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
  const [group, setGroup] = useState<(typeof CARD_GROUPS)[number]['id']>('scan');
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollActiveIntoView = useScrollIntoView<HTMLButtonElement>();

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
        // ללא דוגמאות: אף אחד לא רוצה להדפיס מאתיים כרטיסים עם "דנה כהן"
        const canvas = await renderCard(template, state.values, geometry, state.qrOverride, {
          width: printWidth(template),
          placeholders: 'none',
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
            title: state.values.company || state.values.name || template.name,
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

  const visible = CARD_TEMPLATES.filter((t) => t.group === group);
  const filled = template.usesFields.filter((key) => (state.values[key] ?? '').trim()).length;

  // בידוד דו-כיווני: בלי התווים האלה "90×120" מוצג הפוך בתוך משפט עברי
  const dimensions = `⁦${template.widthMm}×${template.heightMm}⁩`;

  /*
    התצוגה הדביקה נמדדת בגובה ולא ברוחב.

    התבניות נעות מ-85×55 ועד 148×210, ומגבלת רוחב הייתה נותנת לתבנית A5 גובה
    כפול מזה של כרטיס ביקור — היא לבדה הייתה ממלאת את הגיליון ומסתירה את
    הטופס שמתחתיה. גובה קבוע נותן אותה נוכחות לכל התבניות.
  */
  const stageHeight = 8.5;
  const stageStyle = {
    height: `${stageHeight}rem`,
    width: `${(stageHeight * template.widthMm) / template.heightMm}rem`,
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="כרטיסייה מעוצבת"
      subtitle={`${template.name} · ${dimensions} מ״מ`}
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
            הורדת PDF להדפסה
          </Button>
          <Button
            variant="soft"
            size="lg"
            disabled={!geometry}
            loading={busy === 'png'}
            onClick={() => void exportCard('png')}
            icon={<Download size={18} />}
            aria-label="הורדת PNG"
            className="shrink-0 !px-4"
          >
            PNG
          </Button>
        </div>
      }
    >
      {/* ── תצוגה חיה עם ידית גרירה לקוד ──────────────────────────
          מוגבלת בגובה ולא ברוחב: תבנית A5 היא כמעט 1:1.4, ובלי חסם גובה
          היא לבדה הייתה ממלאת את כל הגיליון ומסתירה את כל מה שמתחתיה. */}
      <div className="sticky top-0 z-10 -mx-5 border-b border-border bg-surface px-5 pb-2.5 pt-1">
        <div ref={stageRef} className="relative mx-auto" style={stageStyle}>
          <CardCanvas
            template={template}
            values={state.values}
            geometry={geometry}
            qrOverride={state.qrOverride}
            placeholders="ghost"
            className="border border-black/10 dark:border-white/12"
          />

          {geometry && (
            <motion.button
              type="button"
              drag
              dragMomentum={false}
              dragElastic={0}
              onDrag={(_, info) => handleDrag(info.delta.x, info.delta.y)}
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
            />
          )}
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[0.6875rem] text-fg-subtle">
          <Move size={11} aria-hidden />
          {filled === 0
            ? 'הטקסט האפור הוא דוגמה — הוא לא יודפס'
            : 'אפשר לגרור את הקוד למקום אחר'}
        </p>
      </div>

      {/* ── תבניות ───────────────────────────────────────────────
          שורה נגללת ולא רשת דו-טורית: הרשת דחפה את הטופס אל מתחת לקפל,
          והתצוגה הדביקה חתכה אותה באמצע. */}
      <Section title="תבנית">
        <Pills
          label="קבוצת תבניות"
          layout="grid"
          columns={3}
          value={group}
          onChange={setGroup}
          options={CARD_GROUPS.map((g) => ({ value: g.id, label: g.label }))}
        />

        <motion.div
          key={group}
          variants={listParent}
          initial="hidden"
          animate="show"
          className="rail -mx-5 flex gap-2.5 px-5 pt-1"
        >
          {visible.map((option) => {
            const active = option.id === template.id;
            return (
              <motion.button
                key={option.id}
                ref={active ? scrollActiveIntoView : undefined}
                variants={listItem}
                type="button"
                onClick={() => onChange({ ...state, templateId: option.id, qrOverride: null })}
                whileTap={{ scale: 0.96 }}
                transition={springSnappy}
                aria-pressed={active}
                className="w-[7.5rem] shrink-0 text-start"
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
                    width={340}
                    placeholders="solid"
                    className="border border-black/10 dark:border-white/12"
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
              </motion.button>
            );
          })}
        </motion.div>

        <p className="px-1 text-[0.75rem] leading-relaxed text-fg-muted">{template.blurb}</p>
      </Section>

      <Divider />

      {/* ── תוכן ───────────────────────────────────────────────── */}
      <Section title="תוכן" hint="שדה שנשאר ריק פשוט לא יודפס">
        <div className="space-y-2.5">
          {template.usesFields.map((key) => {
            const field = FIELD_BY_KEY.get(key);
            if (!field) return null;
            return (
              <label key={key} className="block">
                <span className="mb-1 block px-1 text-[0.75rem] font-semibold text-fg-muted">
                  {field.label}
                </span>
                <input
                  type="text"
                  dir={field.dir === 'ltr' ? 'ltr' : 'auto'}
                  value={state.values[key] ?? ''}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={template.sample[key] ?? field.placeholder}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-right text-[0.875rem] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-fg-subtle focus:border-fg"
                />
              </label>
            );
          })}
        </div>
      </Section>

      <Divider />

      {/* ── גודל הקוד ─────────────────────────────────────────── */}
      <Section title="גודל הקוד">
        <Pills
          label="גודל הקוד"
          layout="grid"
          columns={4}
          options={QR_SIZES.map((option) => ({ value: option.value, label: option.label }))}
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
