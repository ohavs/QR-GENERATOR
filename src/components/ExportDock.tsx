import { Copy, Download, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, IconButton } from './ui/Button';
import { canShareFiles } from '@/lib/export';
import type { ExportActions } from '@/hooks/useExportActions';
import type { ExportMode } from './sheets/ExportSheet';

interface ExportDockProps {
  actions: ExportActions;
  onOpenExport: (mode: ExportMode) => void;
}

/**
 * רציף הייצוא — נצמד לתחתית המסך.
 *
 * שלוש פעולות בלבד. בחירת הפורמט ושם הקובץ עברו לגיליון שנפתח בלחיצה,
 * כי אלה החלטות של רגע ההורדה — שורת צ'יפים קבועה עבורן רק גזלה גובה
 * מהמסך הראשי בלי להיות בשימוש ברוב הזמן.
 */
export function ExportDock({ actions, onOpenExport }: ExportDockProps): ReactNode {
  const { busy, disabled, runCopy } = actions;

  return (
    <div className="safe-b sticky bottom-0 z-30 -mx-4 mt-2 bg-bg/90 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="flex gap-2">
        <Button
          variant="ink"
          size="lg"
          block
          disabled={disabled}
          onClick={() => onOpenExport('download')}
          icon={<Download size={18} />}
        >
          הורדה
        </Button>

        {canShareFiles() && (
          <IconButton
            variant="soft"
            size="lg"
            disabled={disabled}
            onClick={() => onOpenExport('share')}
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
  );
}
