import { motion } from 'framer-motion';
import { ImageUp, Trash2 } from 'lucide-react';
import { useCallback, useRef, type ReactNode } from 'react';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section, Toggle } from '../ui/controls';
import type { StudioState } from '@/hooks/useQrStudio';
import { springSnappy } from '@/lib/motion';
import { LOGO_RADII, LOGO_SCALES, snapTo } from '@/lib/qr/options';
import type { QrDesign } from '@/lib/qr/types';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

interface BrandSheetProps {
  open: boolean;
  onClose: () => void;
  state: StudioState;
  design: QrDesign;
  patch: (partial: Partial<StudioState>) => void;
  onError: (message: string) => void;
}

/** לוגו וכיתוב — מה שהופך קוד גנרי לקוד של מותג מסוים. */
export function BrandSheet({
  open,
  onClose,
  state,
  design,
  patch,
  onError,
}: BrandSheetProps): ReactNode {
  const fileRef = useRef<HTMLInputElement>(null);

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
      reader.onload = () =>
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
