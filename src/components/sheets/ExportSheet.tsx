import { Download, FileImage, FileText, Share2, Shapes } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Pills, Section } from '../ui/controls';
import type { ExportActions } from '@/hooks/useExportActions';
import type { ExportFormat } from '@/lib/export';
import type { SizePreset } from '@/lib/sizes';

const FORMATS: Array<{ value: ExportFormat; label: string; icon: ReactNode }> = [
  { value: 'png', label: 'PNG', icon: <FileImage size={14} aria-hidden /> },
  { value: 'svg', label: 'SVG', icon: <Shapes size={14} aria-hidden /> },
  { value: 'pdf', label: 'PDF', icon: <FileText size={14} aria-hidden /> },
  { value: 'jpeg', label: 'JPG', icon: <FileImage size={14} aria-hidden /> },
];

const NOTES: Partial<Record<ExportFormat, string>> = {
  svg: 'קובץ וקטורי לעריכה ולדפוס. הכיתוב בו תלוי בפונט שמותקן במחשב שפותח אותו.',
  pdf: 'מוכן להדפסה בגודל פיזי מדויק.',
};

export type ExportMode = 'download' | 'share';

interface ExportSheetProps {
  open: boolean;
  mode: ExportMode;
  onClose: () => void;
  actions: ExportActions;
  transparent: boolean;
  size: SizePreset;
}

/**
 * גיליון הייצוא.
 *
 * הפורמט ושם הקובץ הם החלטות שמתקבלות ברגע ההורדה, לא לפניה — ולכן הם לא
 * מקבלים שורה קבועה במסך הראשי. בלחיצה על "הורדה" נפתח כאן הכול יחד,
 * והאישור הוא לחיצה אחת נוספת.
 */
export function ExportSheet({
  open,
  mode,
  onClose,
  actions,
  transparent,
  size,
}: ExportSheetProps): ReactNode {
  const { format, setFormat, fileName, setFileName, resolvedFileName, busy, runDownload, runShare } =
    actions;
  const inputRef = useRef<HTMLInputElement>(null);

  // SVG לא נתמך בתפריט השיתוף של רוב המכשירים; משתפים PNG במקומו
  const effectiveFormat: ExportFormat = mode === 'share' && format === 'svg' ? 'png' : format;
  const extension = effectiveFormat === 'jpeg' ? 'jpg' : effectiveFormat;

  // סוגרים ברגע שהפעולה הסתיימה, כדי שלא יישאר גיליון פתוח מעל התוצאה
  const wasBusy = useRef(false);
  useEffect(() => {
    if (busy) wasBusy.current = true;
    else if (wasBusy.current) {
      wasBusy.current = false;
      onClose();
    }
  }, [busy, onClose]);

  const note =
    (transparent && (effectiveFormat === 'pdf' || effectiveFormat === 'jpeg')
      ? `${effectiveFormat === 'pdf' ? 'PDF' : 'JPG'} אינו תומך בשקיפות — הקובץ ייוצא עם רקע לבן.`
      : NOTES[effectiveFormat]) ?? null;

  const run = (): void => {
    void (mode === 'download' ? runDownload() : runShare());
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mode === 'download' ? 'הורדה' : 'שיתוף'}
      subtitle={`${size.label} · ${size.hint}`}
      footer={
        <Button
          variant="ink"
          size="lg"
          block
          loading={!!busy}
          onClick={run}
          icon={mode === 'download' ? <Download size={18} /> : <Share2 size={18} />}
        >
          {mode === 'download' ? 'הורדה' : 'שיתוף'}
        </Button>
      }
    >
      <Section title="פורמט">
        <Pills
          label="פורמט הקובץ"
          layout="grid"
          columns={4}
          options={FORMATS}
          value={effectiveFormat}
          onChange={setFormat}
        />
        {note && <p className="text-xs leading-relaxed text-fg-muted">{note}</p>}
        {mode === 'share' && format === 'svg' && (
          <p className="text-xs leading-relaxed text-fg-muted">
            תפריט השיתוף של רוב המכשירים לא מקבל SVG, ולכן ישותף PNG.
          </p>
        )}
      </Section>

      <Section title="שם הקובץ">
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface px-3.5 transition-colors focus-within:border-fg">
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run();
            }}
            aria-label="שם הקובץ"
            className="h-full min-w-0 flex-1 bg-transparent text-right text-[0.875rem] font-medium outline-none"
          />
          <span className="shrink-0 font-mono text-[0.8125rem] text-fg-subtle" dir="ltr">
            .{extension}
          </span>
        </div>

        {resolvedFileName !== fileName.trim() && (
          <p className="text-xs leading-relaxed text-fg-muted">
            הקובץ יישמר בשם{' '}
            <span className="font-mono text-fg" dir="ltr">
              {resolvedFileName}.{extension}
            </span>{' '}
            — דפדפנים לא שומרים שמות קבצים בעברית.
          </p>
        )}
      </Section>
    </Sheet>
  );
}
