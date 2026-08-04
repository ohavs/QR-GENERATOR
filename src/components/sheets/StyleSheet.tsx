import { Dices, RotateCcw } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { ColorField } from '../ui/ColorField';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section, Toggle } from '../ui/controls';
import type { StudioState } from '@/hooks/useQrStudio';
import { checkScanContrast } from '@/lib/contrast';
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
import type { QrDesign } from '@/lib/qr/types';

interface StyleSheetProps {
  open: boolean;
  onClose: () => void;
  state: StudioState;
  design: QrDesign;
  patch: (partial: Partial<StudioState>) => void;
  onReset: () => void;
}

/** צבעים, צורות והגדרות סריקה — כל מה שמשנה את מראה הקוד עצמו. */
export function StyleSheet({
  open,
  onClose,
  state,
  design,
  patch,
  onReset,
}: StyleSheetProps): ReactNode {
  const contrast = useMemo(
    () =>
      checkScanContrast(
        state.bodyOverride ?? design.body,
        state.transparent ? null : (state.backgroundOverride ?? design.background),
      ),
    [state.bodyOverride, state.backgroundOverride, state.transparent, design],
  );

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
        touched ? (
          <Button variant="soft" size="md" block onClick={onReset} icon={<RotateCcw size={15} />}>
            חזרה לעיצוב המקורי
          </Button>
        ) : undefined
      }
    >
      <Button
        variant="soft"
        size="md"
        block
        icon={<Dices size={16} />}
        onClick={() => patch(shuffleDesign())}
        className="mt-1"
      >
        הגרלת שילוב
      </Button>

      <Section title="צבע">
        <div className="space-y-4">
          <ColorField
            label="צבע הקוד"
            value={state.bodyOverride ?? design.body}
            onChange={(paint) => patch({ bodyOverride: paint })}
          />
          {!state.transparent && (
            <ColorField
              label="צבע הרקע"
              value={state.backgroundOverride ?? design.background ?? { type: 'solid', color: '#FFFFFF' }}
              onChange={(paint) => patch({ backgroundOverride: paint })}
              allowGradient={false}
            />
          )}
        </div>

        {contrast.message && (
          <p
            className={
              contrast.risk === 'poor'
                ? 'rounded-[var(--radius-control)] bg-danger/10 px-3 py-2.5 text-xs leading-relaxed text-danger'
                : 'rounded-[var(--radius-control)] bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning'
            }
          >
            {contrast.message} ({contrast.ratio.toFixed(1)}:1)
          </p>
        )}

        <Toggle
          checked={state.transparent}
          onChange={(v) => patch({ transparent: v })}
          label="ללא רקע"
          description="רק הקוד עצמו, בשקיפות — להנחה על תמונה או עיצוב קיים"
        />
      </Section>

      <Divider />

      <Section title="צורת המודולים">
        <Pills
          label="צורת המודולים"
          options={MODULE_SHAPES}
          value={state.moduleShape ?? design.moduleShape}
          onChange={(v) => patch({ moduleShape: v })}
        />
      </Section>

      <Section title="מסגרת העיניים">
        <Pills
          label="מסגרת העיניים"
          options={EYE_FRAMES}
          value={state.eyeFrame ?? design.eyeFrame}
          onChange={(v) => patch({ eyeFrame: v })}
        />
      </Section>

      <Section title="מרכז העיניים">
        <Pills
          label="מרכז העיניים"
          options={EYE_BALLS}
          value={state.eyeBall ?? design.eyeBall}
          onChange={(v) => patch({ eyeBall: v })}
        />
      </Section>

      <Divider />

      <Section title="גודל המודולים">
        <Pills
          label="גודל המודולים"
          layout="grid"
          columns={3}
          options={DOT_SCALES}
          value={snapTo(DOT_SCALES, state.dotScale ?? design.dotScale)}
          onChange={(v) => patch({ dotScale: v })}
        />
      </Section>

      <Section title="עיגול פינות">
        <Pills
          label="עיגול פינות"
          layout="grid"
          columns={4}
          options={CORNER_RADII}
          value={snapTo(CORNER_RADII, state.cornerRadius ?? design.cornerRadius)}
          onChange={(v) => patch({ cornerRadius: v })}
        />
      </Section>

      <Divider />

      <Section
        title="שוליים"
        hint="השטח הריק סביב הקוד. שוליים צרים מדי פוגעים בזיהוי."
      >
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
        hint="רמה גבוהה שורדת שריטות והדפסה גרועה, אבל מייצרת קוד צפוף יותר. עם לוגו — השאירו על 'מרבי'."
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
    </Sheet>
  );
}
