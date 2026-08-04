import { Copy, Download, FileImage, FileText, Share2, Shapes } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/Button';
import { Segmented } from './ui/Field';
import { canShareFiles, type ExportFormat } from '@/lib/export';
import type { ExportActions } from '@/hooks/useExportActions';

const FORMATS: Array<{ value: ExportFormat; label: string; icon: ReactNode }> = [
  { value: 'png', label: 'PNG', icon: <FileImage size={14} aria-hidden /> },
  { value: 'svg', label: 'SVG', icon: <Shapes size={14} aria-hidden /> },
  { value: 'pdf', label: 'PDF', icon: <FileText size={14} aria-hidden /> },
  { value: 'jpeg', label: 'JPG', icon: <FileImage size={14} aria-hidden /> },
];

interface ExportBarProps {
  actions: ExportActions;
  transparent: boolean;
}

export function ExportBar({ actions, transparent }: ExportBarProps): ReactNode {
  const { format, setFormat, busy, disabled, runDownload, runShare, runCopy } = actions;

  return (
    <div className="space-y-3">
      <Segmented
        aria-label="פורמט הקובץ"
        options={FORMATS}
        value={format}
        onChange={setFormat}
        size="sm"
      />

      {format === 'svg' && (
        <p className="text-xs leading-relaxed text-fg-muted">
          SVG הוא קובץ וקטורי — מושלם לדפוס ולעריכה, אבל הכיתוב בו תלוי בפונט שמותקן במחשב שפותח
          אותו.
        </p>
      )}
      {(format === 'pdf' || format === 'jpeg') && transparent && (
        <p className="text-xs leading-relaxed text-fg-muted">
          {format === 'pdf' ? 'PDF' : 'JPG'} אינו תומך בשקיפות — הקובץ ייוצא עם רקע לבן.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
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
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            loading={busy === 'share'}
            onClick={() => void runShare()}
            icon={<Share2 size={18} />}
            aria-label="שיתוף הקוד"
            className="shrink-0 px-4"
          >
            <span className="hidden sm:inline">שיתוף</span>
          </Button>
        )}

        <Button
          variant="secondary"
          size="lg"
          disabled={disabled}
          loading={busy === 'copy'}
          onClick={() => void runCopy()}
          icon={<Copy size={18} />}
          aria-label="העתקת התמונה"
          className="shrink-0 px-4"
        >
          <span className="hidden sm:inline">העתקה</span>
        </Button>
      </div>
    </div>
  );
}
