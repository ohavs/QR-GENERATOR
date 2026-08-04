import { Copy, Download, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, IconButton } from './ui/Button';
import { Pills } from './ui/controls';
import { canShareFiles, type ExportFormat } from '@/lib/export';
import type { ExportActions } from '@/hooks/useExportActions';

const FORMATS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF' },
  { value: 'jpeg', label: 'JPG' },
];

interface ExportDockProps {
  actions: ExportActions;
  transparent: boolean;
}

/**
 * רציף הייצוא — נצמד לתחתית המסך.
 *
 * ההורדה היא הפעולה שכל שאר המסך מוביל אליה, ולכן היא נשארת בהישג אגודל
 * בלי קשר לכמה גללו. זה גם הכפתור המלא היחיד באפליקציה.
 */
export function ExportDock({ actions, transparent }: ExportDockProps): ReactNode {
  const { format, setFormat, busy, disabled, runDownload, runShare, runCopy } = actions;

  const notice =
    format === 'svg'
      ? 'קובץ וקטורי לעריכה ולדפוס. הכיתוב בו תלוי בפונט שמותקן במחשב שפותח אותו.'
      : (format === 'pdf' || format === 'jpeg') && transparent
        ? `${format === 'pdf' ? 'PDF' : 'JPG'} אינו תומך בשקיפות — הקובץ ייוצא עם רקע לבן.`
        : null;

  return (
    <div className="safe-b sticky bottom-0 z-30 -mx-4 mt-2 bg-bg/90 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="space-y-2.5">
        <Pills
          label="פורמט הקובץ"
          layout="grid"
          columns={4}
          options={FORMATS}
          value={format}
          onChange={setFormat}
        />

        {notice && <p className="px-1 text-xs leading-relaxed text-fg-muted">{notice}</p>}

        <div className="flex gap-2">
          <Button
            variant="ink"
            size="lg"
            block
            disabled={disabled}
            loading={busy === 'download'}
            onClick={() => void runDownload()}
            icon={<Download size={18} />}
          >
            הורדה
          </Button>

          {canShareFiles() && (
            <IconButton
              variant="soft"
              size="lg"
              disabled={disabled}
              loading={busy === 'share'}
              onClick={() => void runShare()}
              aria-label="שיתוף הקוד"
            >
              <Share2 size={18} aria-hidden />
            </IconButton>
          )}

          <IconButton
            variant="soft"
            size="lg"
            disabled={disabled}
            loading={busy === 'copy'}
            onClick={() => void runCopy()}
            aria-label="העתקת התמונה"
          >
            <Copy size={18} aria-hidden />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
