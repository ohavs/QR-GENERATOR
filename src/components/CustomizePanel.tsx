import { ImageUp, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { Field, Segmented, Slider, Switch } from './ui/Field';
import { PaintPicker } from './ui/PaintPicker';
import { cn } from '@/lib/cn';
import { checkScanContrast } from '@/lib/contrast';
import type { StudioState } from '@/hooks/useQrStudio';
import type { EcLevel, EyeBallShape, EyeFrameShape, ModuleShape, QrDesign } from '@/lib/qr/types';

const MODULE_SHAPES: Array<{ value: ModuleShape; label: string }> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'dot', label: 'עיגול' },
  { value: 'fluid', label: 'זורם' },
  { value: 'classy', label: 'אלכסוני' },
  { value: 'diamond', label: 'מעוין' },
  { value: 'vbars', label: 'פסים ↕' },
  { value: 'hbars', label: 'פסים ↔' },
  { value: 'star', label: 'ניצוץ' },
  { value: 'plus', label: 'צלב' },
];

const EYE_FRAMES: Array<{ value: EyeFrameShape; label: string }> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'circle', label: 'עיגול' },
  { value: 'leaf', label: 'עלה' },
  { value: 'shield', label: 'מגן' },
  { value: 'cut', label: 'קטום' },
];

const EYE_BALLS: Array<{ value: EyeBallShape; label: string }> = [
  { value: 'square', label: 'ריבוע' },
  { value: 'rounded', label: 'מעוגל' },
  { value: 'circle', label: 'עיגול' },
  { value: 'diamond', label: 'מעוין' },
  { value: 'leaf', label: 'עלה' },
  { value: 'flower', label: 'פרח' },
];

const EC_LEVELS: Array<{ value: EcLevel; label: string }> = [
  { value: 'L', label: 'נמוך' },
  { value: 'M', label: 'בינוני' },
  { value: 'Q', label: 'גבוה' },
  { value: 'H', label: 'מרבי' },
];

interface CustomizePanelProps {
  state: StudioState;
  design: QrDesign;
  patch: (partial: Partial<StudioState>) => void;
  onResetCustomizations: () => void;
  onLogoError: (message: string) => void;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function CustomizePanel({
  state,
  design,
  patch,
  onResetCustomizations,
  onLogoError,
}: CustomizePanelProps): ReactNode {
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickLogo = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        onLogoError('אפשר להעלות קובצי תמונה בלבד');
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        onLogoError('הקובץ גדול מ‑2MB. נסו תמונה קטנה יותר.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        patch({
          logo: {
            src: String(reader.result),
            scale: state.logo?.scale ?? 0.2,
            padding: state.logo?.padding ?? 0.12,
            radius: state.logo?.radius ?? 0.22,
            excavate: state.logo?.excavate ?? true,
          },
          // לוגו מכסה מודולים — רמת תיקון מרבית שומרת על יכולת הסריקה
          ecLevel: 'H',
        });
      };
      reader.onerror = () => onLogoError('קריאת הקובץ נכשלה');
      reader.readAsDataURL(file);
    },
    [onLogoError, patch, state.logo],
  );

  const contrast = useMemo(
    () =>
      checkScanContrast(
        state.bodyOverride ?? design.body,
        state.transparent ? null : (state.backgroundOverride ?? design.background),
      ),
    [state.bodyOverride, state.backgroundOverride, state.transparent, design],
  );

  const hasCustomizations =
    state.moduleShape !== null ||
    state.eyeFrame !== null ||
    state.eyeBall !== null ||
    state.dotScale !== null ||
    state.cornerRadius !== null ||
    state.bodyOverride !== null ||
    state.backgroundOverride !== null;

  return (
    <div className="space-y-6">
      {/* ── צבעים ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>צבעים</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <PaintPicker
            label="צבע הקוד"
            value={state.bodyOverride ?? design.body}
            onChange={(paint) => patch({ bodyOverride: paint })}
          />
          <PaintPicker
            label="צבע הרקע"
            value={state.backgroundOverride ?? design.background ?? { type: 'solid', color: '#FFFFFF' }}
            onChange={(paint) => patch({ backgroundOverride: paint, transparent: false })}
            allowGradient={false}
          />
        </div>
        {contrast.message && (
          <p
            className={cn(
              'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed',
              contrast.risk === 'poor'
                ? 'bg-danger/10 text-danger'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
            )}
          >
            <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {contrast.message}{' '}
              <span className="font-mono opacity-80">({contrast.ratio.toFixed(1)}:1)</span>
            </span>
          </p>
        )}

        <Switch
          checked={state.transparent}
          onChange={(v) => patch({ transparent: v })}
          label="הורדת הרקע"
          description="רק הקוד עצמו, בלי לוח רקע — מתאים להנחה על תמונה או עיצוב קיים (PNG/SVG בלבד)"
        />
      </section>

      <Divider />

      {/* ── צורות ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>צורות</SectionTitle>

        <Field label="צורת המודולים">
          {() => (
            <ChipGrid
              options={MODULE_SHAPES}
              value={state.moduleShape ?? design.moduleShape}
              onChange={(v) => patch({ moduleShape: v })}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="מסגרת העיניים">
            {() => (
              <ChipGrid
                options={EYE_FRAMES}
                value={state.eyeFrame ?? design.eyeFrame}
                onChange={(v) => patch({ eyeFrame: v })}
                columns={3}
              />
            )}
          </Field>
          <Field label="מרכז העיניים">
            {() => (
              <ChipGrid
                options={EYE_BALLS}
                value={state.eyeBall ?? design.eyeBall}
                onChange={(v) => patch({ eyeBall: v })}
                columns={3}
              />
            )}
          </Field>
        </div>

        <Field
          label="גודל המודולים"
          value={`${Math.round((state.dotScale ?? design.dotScale) * 100)}%`}
          hint="ערך נמוך יוצר מראה אוורירי יותר. מתחת ל‑70% מומלץ לבדוק סריקה במכשיר אמיתי."
        >
          {(id) => (
            <Slider
              id={id}
              min={0.55}
              max={1}
              step={0.01}
              value={state.dotScale ?? design.dotScale}
              onChange={(v) => patch({ dotScale: v })}
            />
          )}
        </Field>

        <Field
          label="עיגול פינות הרקע"
          value={`${Math.round((state.cornerRadius ?? design.cornerRadius) * 100)}%`}
        >
          {(id) => (
            <Slider
              id={id}
              min={0}
              max={0.28}
              step={0.01}
              value={state.cornerRadius ?? design.cornerRadius}
              onChange={(v) => patch({ cornerRadius: v })}
            />
          )}
        </Field>
      </section>

      <Divider />

      {/* ── לוגו ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>לוגו במרכז</SectionTitle>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          onChange={(e) => {
            onPickLogo(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {state.logo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
              <img
                src={state.logo.src}
                alt="תצוגה מקדימה של הלוגו"
                className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
              />
              <p className="flex-1 text-sm font-medium">הלוגו נוסף למרכז הקוד</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => patch({ logo: null })}
                icon={<Trash2 size={15} />}
                aria-label="הסרת הלוגו"
              />
            </div>

            <Field label="גודל הלוגו" value={`${Math.round(state.logo.scale * 100)}%`}>
              {(id) => (
                <Slider
                  id={id}
                  min={0.12}
                  max={0.3}
                  step={0.01}
                  value={state.logo!.scale}
                  onChange={(v) => patch({ logo: { ...state.logo!, scale: v } })}
                />
              )}
            </Field>

            <Field label="עיגול פינות הלוגו" value={`${Math.round(state.logo.radius * 200)}%`}>
              {(id) => (
                <Slider
                  id={id}
                  min={0}
                  max={0.5}
                  step={0.02}
                  value={state.logo!.radius}
                  onChange={(v) => patch({ logo: { ...state.logo!, radius: v } })}
                />
              )}
            </Field>

            <Switch
              checked={state.logo.excavate}
              onChange={(v) => patch({ logo: { ...state.logo!, excavate: v } })}
              label="פינוי מקום מתחת ללוגו"
              description="מסיר את המודולים שמאחורי הלוגו כדי שהוא ייקרא נקי"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface-2 px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary-soft"
          >
            <ImageUp size={24} className="text-fg-subtle" aria-hidden />
            <span className="text-sm font-semibold">העלאת לוגו</span>
            <span className="text-xs text-fg-subtle">PNG · JPG · SVG · עד 2MB</span>
          </button>
        )}
      </section>

      <Divider />

      {/* ── כיתוב ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle>כיתוב מתחת לקוד</SectionTitle>
        <Switch
          checked={state.frameEnabled}
          onChange={(v) => patch({ frameEnabled: v })}
          label="הוספת כיתוב"
          description={`סגנון הכיתוב מותאם אוטומטית לעיצוב "${design.name}"`}
        />
        {state.frameEnabled && (
          <Field label="הטקסט" hint="קצר עדיף — עד 22 תווים נקראים היטב בכל גודל">
            {(id) => (
              <input
                id={id}
                type="text"
                dir="auto"
                maxLength={28}
                value={state.frameText}
                onChange={(e) => patch({ frameText: e.target.value })}
                placeholder="סרקו אותי"
                className="h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 text-sm font-medium outline-none transition-colors focus:border-primary"
              />
            )}
          </Field>
        )}
      </section>

      <Divider />

      {/* ── מתקדם ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionTitle>מתקדם</SectionTitle>

        <Field
          label="רמת תיקון שגיאות"
          hint="רמה גבוהה יותר שורדת שריטות והדפסה גרועה, אבל מייצרת קוד צפוף יותר. עם לוגו — השאירו על 'מרבי'."
        >
          {() => (
            <Segmented
              aria-label="רמת תיקון שגיאות"
              options={EC_LEVELS}
              value={state.ecLevel}
              onChange={(v) => patch({ ecLevel: v })}
              size="sm"
            />
          )}
        </Field>

        <Field
          label="שוליים לבנים"
          value={`${state.quietZone} מודולים`}
          hint="התקן ממליץ על 4 לפחות. שוליים קטנים מדי פוגעים בזיהוי הקוד."
        >
          {(id) => (
            <Slider
              id={id}
              min={0}
              max={8}
              step={0.5}
              value={state.quietZone}
              onChange={(v) => patch({ quietZone: v })}
            />
          )}
        </Field>

        {hasCustomizations && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetCustomizations}
            icon={<RotateCcw size={15} />}
            block
          >
            איפוס ההתאמות וחזרה לעיצוב המקורי
          </Button>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }): ReactNode {
  return <h3 className="text-xs font-bold uppercase tracking-wide text-fg-subtle">{children}</h3>;
}

function Divider(): ReactNode {
  return <hr className="border-border" />;
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 5,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}): ReactNode {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={cn(
            'h-10 truncate rounded-xl border px-1.5 text-xs font-semibold transition-all duration-200',
            opt.value === value
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-surface-2 text-fg-muted hover:border-border-strong hover:text-fg',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
