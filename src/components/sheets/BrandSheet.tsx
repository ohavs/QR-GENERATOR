import { motion } from 'framer-motion';
import { Check, ImageUp, Loader2, Palette, Trash2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section, Toggle } from '../ui/controls';
import type { StudioState } from '@/hooks/useQrStudio';
import { extractPalette } from '@/lib/logo/palette';
import { removeBackground, type BackgroundStrength } from '@/lib/logo/removeBackground';
import { paintToColor } from '@/lib/qr/render/common';
import { cn } from '@/lib/cn';
import { springSnappy } from '@/lib/motion';
import { BG_STRENGTHS, LOGO_RADII, LOGO_SCALES, snapTo } from '@/lib/qr/options';
import type { LogoSpec, QrDesign } from '@/lib/qr/types';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface BrandSheetProps {
  open: boolean;
  onClose: () => void;
  state: StudioState;
  design: QrDesign;
  patch: (partial: Partial<StudioState>) => void;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

/** לוגו וכיתוב — מה שהופך קוד גנרי לקוד של מותג מסוים. */
export function BrandSheet({
  open,
  onClose,
  state,
  design,
  patch,
  onError,
  onInfo,
}: BrandSheetProps): ReactNode {
  const fileRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [palette, setPalette] = useState<string[]>([]);

  const backgroundColor = state.transparent
    ? '#FFFFFF'
    : paintToColor(state.backgroundOverride ?? design.background ?? { type: 'solid', color: '#FFFFFF' });

  /*
   * חילוץ הפלטה מהמקור ולא מהתמונה המעובדת: הסרת רקע יכולה לאכול גוונים
   * בקצוות, והצבעים של המותג נמצאים בקובץ שהועלה.
   */
  const logoSource = state.logo?.originalSrc;
  useEffect(() => {
    if (!logoSource) {
      setPalette([]);
      return;
    }
    let cancelled = false;
    void extractPalette(logoSource, { background: backgroundColor })
      .then((colors) => {
        if (!cancelled) setPalette(colors);
      })
      .catch(() => {
        if (!cancelled) setPalette([]);
      });
    return () => {
      cancelled = true;
    };
  }, [logoSource, backgroundColor]);

  const activeBody = state.bodyOverride?.type === 'solid' ? state.bodyOverride.color : null;

  /**
   * מחיל (או מבטל) הסרת רקע על הלוגו.
   *
   * המקור נשמר תמיד ב-`originalSrc`, וכל שינוי עוצמה מעבד אותו מחדש — כך
   * שהמעבר בין העוצמות אינו מצטבר ואינו הרסני.
   */
  const applyBgRemoval = useCallback(
    async (logo: LogoSpec, mode: LogoSpec['bgRemoval']) => {
      if (mode === 'off') {
        patch({ logo: { ...logo, src: logo.originalSrc, bgRemoval: 'off' } });
        return;
      }
      setWorking(true);
      try {
        const result = await removeBackground(logo.originalSrc, mode as BackgroundStrength);
        if (!result.changed) {
          onInfo('לא נמצא רקע אחיד להסרה בתמונה הזו');
          patch({ logo: { ...logo, src: logo.originalSrc, bgRemoval: 'off' } });
          return;
        }
        patch({ logo: { ...logo, src: result.src, bgRemoval: mode } });
      } catch {
        onError('הסרת הרקע נכשלה');
      } finally {
        setWorking(false);
      }
    },
    [onError, onInfo, patch],
  );

  const pickLogo = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        onError('אפשר להעלות קובצי תמונה בלבד');
        return;
      }
      if (file.size > MAX_LOGO_BYTES) {
        onError('הקובץ גדול מ‑2MB. נסו תמונה קטנה יותר.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        patch({
          logo: {
            src,
            originalSrc: src,
            bgRemoval: 'off',
            scale: state.logo?.scale ?? 0.2,
            padding: state.logo?.padding ?? 0.12,
            radius: state.logo?.radius ?? 0.22,
            excavate: state.logo?.excavate ?? true,
          },
          // לוגו מכסה מודולים — רמת תיקון מרבית שומרת על יכולת הסריקה
          ecLevel: 'H',
        });
      };
      reader.onerror = () => onError('קריאת הקובץ נכשלה');
      reader.readAsDataURL(file);
    },
    [onError, patch, state.logo],
  );

  return (
    <Sheet open={open} onClose={onClose} title="לוגו וכיתוב">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="sr-only"
        onChange={(e) => {
          pickLogo(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <Section title="לוגו במרכז">
        {state.logo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[var(--radius-tile)] border border-border p-3">
              <img
                src={state.logo.src}
                alt="תצוגה מקדימה של הלוגו"
                className="h-12 w-12 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
              />
              <p className="flex-1 text-[0.875rem] font-medium">הלוגו נוסף למרכז הקוד</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                transition={springSnappy}
                onClick={() => patch({ logo: null })}
                aria-label="הסרת הלוגו"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <Trash2 size={16} aria-hidden />
              </motion.button>
            </div>

            {palette.length > 0 && (
              <div className="space-y-2.5">
                <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
                  <Palette size={14} className="text-accent" aria-hidden />
                  צבעים מהלוגו
                </p>
                <div className="rail -mx-5 flex gap-2 px-5 py-0.5">
                  {palette.map((color) => {
                    const active = activeBody === color;
                    return (
                      <motion.button
                        key={color}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        transition={springSnappy}
                        onClick={() => patch({ bodyOverride: { type: 'solid', color } })}
                        aria-label={`צביעת הקוד ב-${color}`}
                        aria-pressed={active}
                        className={cn(
                          'grid h-11 w-11 shrink-0 place-items-center rounded-full border',
                          active ? 'border-fg' : 'border-black/10 dark:border-white/15',
                        )}
                        style={{ background: color }}
                      >
                        {active && (
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-white shadow">
                            <Check size={12} strokeWidth={3} className="text-black" aria-hidden />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-fg-muted">
                  הצבעים חולצו מהלוגו והוכהו לפי הצורך כדי שהקוד יישאר סָריק.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
                  <Wand2 size={14} className="text-accent" aria-hidden />
                  הסרת רקע אוטומטית
                </p>
                {working && <Loader2 size={14} className="animate-spin text-fg-muted" aria-hidden />}
              </div>
              <Pills
                label="הסרת רקע אוטומטית"
                layout="grid"
                columns={4}
                options={BG_STRENGTHS}
                value={state.logo.bgRemoval}
                onChange={(v) => void applyBgRemoval(state.logo!, v)}
              />
              <p className="text-xs leading-relaxed text-fg-muted">
                מזהה את הרקע האחיד סביב הלוגו ומסיר אותו. עוצמה חזקה יותר מסירה גם גוונים
                קרובים — שימושי בסריקות, אבל עלולה לנגוס בלוגו עצמו.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-[0.8125rem] font-semibold">גודל</p>
              <Pills
                label="גודל הלוגו"
                layout="grid"
                columns={3}
                options={LOGO_SCALES}
                value={snapTo(LOGO_SCALES, state.logo.scale)}
                onChange={(v) => patch({ logo: { ...state.logo!, scale: v } })}
              />
            </div>

            <div className="space-y-2.5">
              <p className="text-[0.8125rem] font-semibold">צורה</p>
              <Pills
                label="צורת הלוגו"
                layout="grid"
                columns={3}
                options={LOGO_RADII}
                value={snapTo(LOGO_RADII, state.logo.radius)}
                onChange={(v) => patch({ logo: { ...state.logo!, radius: v } })}
              />
            </div>

            <Toggle
              checked={state.logo.excavate}
              onChange={(v) => patch({ logo: { ...state.logo!, excavate: v } })}
              label="פינוי מקום מתחת ללוגו"
              description="מסיר את המודולים שמאחורי הלוגו כדי שהוא ייקרא נקי"
            />
          </div>
        ) : (
          <motion.button
            type="button"
            onClick={() => fileRef.current?.click()}
            whileTap={{ scale: 0.98 }}
            transition={springSnappy}
            className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-tile)] border border-dashed border-border-strong px-4 py-8 text-center transition-colors hover:border-fg"
          >
            <ImageUp size={22} className="text-fg-subtle" aria-hidden />
            <span className="text-[0.875rem] font-semibold">העלאת לוגו</span>
            <span className="text-xs text-fg-subtle">PNG · JPG · SVG · עד 2MB</span>
          </motion.button>
        )}
      </Section>

      <Divider />

      <Section title="כיתוב מתחת לקוד">
        <Toggle
          checked={state.frameEnabled}
          onChange={(v) => patch({ frameEnabled: v })}
          label="הוספת כיתוב"
          description={`סגנון המסגרת נקבע אוטומטית לפי העיצוב "${design.name}"`}
        />

        {state.frameEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={springSnappy}
            className="overflow-hidden"
          >
            <input
              type="text"
              dir="auto"
              maxLength={28}
              value={state.frameText}
              onChange={(e) => patch({ frameText: e.target.value })}
              placeholder="סרקו אותי"
              aria-label="טקסט הכיתוב"
              className="mt-3 h-12 w-full rounded-full border border-border bg-surface-2 px-4 text-center text-[0.9375rem] font-medium outline-none transition-colors focus:border-fg"
            />
            <p className="mt-2 text-center text-xs text-fg-muted">
              קצר עדיף — עד 22 תווים נקראים היטב בכל גודל
            </p>
          </motion.div>
        )}
      </Section>
    </Sheet>
  );
}
