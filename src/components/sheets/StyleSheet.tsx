import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Dices, RotateCcw } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { QrSvg } from '../QrSvg';
import { Button } from '../ui/Button';
import { ColorField } from '../ui/ColorField';
import { Sheet } from '../ui/Sheet';
import { ShapePicker } from '../ui/ShapePicker';
import { Pills, Section, Toggle } from '../ui/controls';
import { cn } from '@/lib/cn';
import type { StudioState } from '@/hooks/useQrStudio';
import { checkScanContrast } from '@/lib/contrast';
import { fade, springSnappy } from '@/lib/motion';
import {
  CORNER_RADII,
  DOT_SCALES,
  EC_LEVELS,
  EYE_BALLS,
  EYE_FRAMES,
  MODULE_SHAPES,
  QUIET_ZONES,
  snapTo,
} from '@/lib/qr/options';
import { shuffleDesign } from '@/lib/qr/shuffle';
import { buildGeometry } from '@/lib/qr/geometry';
import type { QrDesign } from '@/lib/qr/types';

/** ערך קצר וקבוע לתצוגה שבתוך הגיליון — היא על העיצוב, לא על התוכן. */
const SAMPLE = 'https://qr.studio/preview';

type Tab = 'color' | 'shape';

interface StyleSheetProps {
  open: boolean;
  onClose: () => void;
  state: StudioState;
  design: QrDesign;
  patch: (partial: Partial<StudioState>) => void;
  onReset: () => void;
}

/**
 * צבעים וצורות.
 *
 * היו כאן תשעה מקטעים בגלילה אחת ארוכה, כולם באותה בליטה, ובלי לראות את הקוד
 * — כלומר כל שינוי דרש לסגור את הגיליון, להסתכל, ולפתוח שוב. שלושה שינויים
 * מטפלים בזה: תצוגה חיה נעוצה למעלה, פיצול לשתי לשוניות שכל אחת מהן מסך אחד
 * קצר, והורדת שתי ההגדרות המקצועיות (שוליים ותיקון שגיאות) אל מתחת למגירה.
 */
export function StyleSheet({
  open,
  onClose,
  state,
  design,
  patch,
  onReset,
}: StyleSheetProps): ReactNode {
  const [tab, setTab] = useState<Tab>('color');
  const [advanced, setAdvanced] = useState(false);

  const contrast = useMemo(
    () =>
      checkScanContrast(
        state.bodyOverride ?? design.body,
        state.transparent ? null : (state.backgroundOverride ?? design.background),
      ),
    [state.bodyOverride, state.backgroundOverride, state.transparent, design],
  );

  /* התצוגה נבנית מהערך הקבוע ומההגדרות הנוכחיות — זולה, ומשקפת כל שינוי מיד */
  const preview = useMemo(() => {
    try {
      return buildGeometry({
        value: SAMPLE,
        design,
        bodyOverride: state.bodyOverride ?? undefined,
        eyeFrameOverride: state.bodyOverride ?? undefined,
        eyeBallOverride: state.bodyOverride ?? undefined,
        backgroundOverride: state.backgroundOverride,
        transparentBackground: state.transparent,
        quietZone: state.quietZone,
        ecLevel: state.ecLevel,
        moduleShape: state.moduleShape ?? undefined,
        eyeFrame: state.eyeFrame ?? undefined,
        eyeBall: state.eyeBall ?? undefined,
        dotScale: state.dotScale ?? undefined,
        cornerRadius: state.cornerRadius ?? undefined,
        logo: null,
        frame: { enabled: false, text: '' },
      });
    } catch {
      return null;
    }
  }, [design, state]);

  const touched =
    state.moduleShape !== null ||
    state.eyeFrame !== null ||
    state.eyeBall !== null ||
    state.dotScale !== null ||
    state.cornerRadius !== null ||
    state.bodyOverride !== null ||
    state.backgroundOverride !== null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="צבעים וצורות"
      subtitle={`מבוסס על "${design.name}"`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="ink"
            size="md"
            block
            icon={<Dices size={16} />}
            onClick={() => patch(shuffleDesign())}
          >
            רנדומלי
          </Button>
          {touched && (
            <Button
              variant="soft"
              size="md"
              onClick={onReset}
              icon={<RotateCcw size={15} />}
              aria-label="חזרה לעיצוב המקורי"
              className="shrink-0 !px-4"
            >
              איפוס
            </Button>
          )}
        </div>
      }
    >
      {/* ── תצוגה חיה + לשוניות ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3 pt-1">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-[6.5rem] shrink-0 rounded-[var(--radius-tile)] p-2',
              state.transparent ? 'checkerboard border border-border' : 'border border-border',
            )}
          >
            {preview && <QrSvg geo={preview} title="תצוגה מקדימה" className="w-full" />}
          </div>

          <div className="min-w-0 flex-1">
            <div
              role="tablist"
              className="flex gap-1 rounded-full border border-border bg-surface p-1"
            >
              {(
                [
                  ['color', 'צבע'],
                  ['shape', 'צורה'],
                ] as Array<[Tab, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'relative h-9 flex-1 rounded-full text-[0.8125rem] font-semibold transition-colors',
                    tab === id ? 'text-ink-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {tab === id && (
                    <motion.span
                      layoutId="style-tab"
                      transition={springSnappy}
                      className="absolute inset-0 rounded-full bg-ink"
                      aria-hidden
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            {contrast.message && (
              <p
                className={cn(
                  'mt-2 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[0.6875rem] leading-snug',
                  contrast.risk === 'poor'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-warning/10 text-warning',
                )}
              >
                {contrast.message} ({contrast.ratio.toFixed(1)}:1)
              </p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={fade}
        >
          {tab === 'color' ? (
            <>
              <Section title="צבע הקוד">
                <ColorField
                  label="צבע הקוד"
                  value={state.bodyOverride ?? design.body}
                  onChange={(paint) => patch({ bodyOverride: paint })}
                />
              </Section>

              <Section title="רקע">
                {!state.transparent && (
                  <ColorField
                    label="צבע הרקע"
                    value={
                      state.backgroundOverride ??
                      design.background ?? { type: 'solid', color: '#FFFFFF' }
                    }
                    onChange={(paint) => patch({ backgroundOverride: paint })}
                    allowGradient={false}
                  />
                )}
                <Toggle
                  checked={state.transparent}
                  onChange={(v) => patch({ transparent: v })}
                  label="ללא רקע"
                  description="רק הקוד עצמו, בשקיפות — להנחה על תמונה או עיצוב קיים"
                />
              </Section>
            </>
          ) : (
            <>
              <Section title="המודולים">
                <ShapePicker
                  kind="module"
                  label="צורת המודולים"
                  options={MODULE_SHAPES}
                  value={state.moduleShape ?? design.moduleShape}
                  onChange={(v) => patch({ moduleShape: v })}
                />
                <Pills
                  label="גודל המודולים"
                  layout="grid"
                  columns={3}
                  options={DOT_SCALES}
                  value={snapTo(DOT_SCALES, state.dotScale ?? design.dotScale)}
                  onChange={(v) => patch({ dotScale: v })}
                />
              </Section>

              <Section title="העיניים">
                <ShapePicker
                  kind="eyeFrame"
                  label="מסגרת העיניים"
                  options={EYE_FRAMES}
                  value={state.eyeFrame ?? design.eyeFrame}
                  onChange={(v) => patch({ eyeFrame: v })}
                />
                <ShapePicker
                  kind="eyeBall"
                  label="מרכז העיניים"
                  options={EYE_BALLS}
                  value={state.eyeBall ?? design.eyeBall}
                  onChange={(v) => patch({ eyeBall: v })}
                />
              </Section>

              <Section title="פינות הלוח">
                <Pills
                  label="עיגול פינות"
                  layout="grid"
                  columns={4}
                  options={CORNER_RADII}
                  value={snapTo(CORNER_RADII, state.cornerRadius ?? design.cornerRadius)}
                  onChange={(v) => patch({ cornerRadius: v })}
                />
              </Section>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── מתקדם ────────────────────────────────────────────────
          שוליים ותיקון שגיאות משנים את הסריקוּת ולא את המראה. הם נשארים
          נגישים, אבל לא גובים תשומת לב ממי שבא לבחור צבע. */}
      <div className="mt-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          aria-expanded={advanced}
          className="flex w-full items-center gap-2 py-2.5 text-start"
        >
          <span className="flex-1 text-[0.8125rem] font-bold text-fg-muted">הגדרות סריקה</span>
          <motion.span animate={{ rotate: advanced ? 180 : 0 }} transition={springSnappy}>
            <ChevronDown size={16} className="text-fg-subtle" aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springSnappy}
              className="overflow-hidden"
            >
              <Section title="שוליים" hint="השטח הריק סביב הקוד. צר מדי פוגע בזיהוי.">
                <Pills
                  label="שוליים"
                  layout="grid"
                  columns={3}
                  options={QUIET_ZONES}
                  value={snapTo(QUIET_ZONES, state.quietZone)}
                  onChange={(v) => patch({ quietZone: v })}
                />
              </Section>

              <Section
                title="תיקון שגיאות"
                hint="רמה גבוהה שורדת שריטות והדפסה גרועה, אבל מייצרת קוד צפוף יותר. עם לוגו — השאירו על ׳מרבי׳."
              >
                <Pills
                  label="רמת תיקון שגיאות"
                  layout="grid"
                  columns={4}
                  options={EC_LEVELS}
                  value={state.ecLevel}
                  onChange={(v) => patch({ ecLevel: v })}
                />
              </Section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
