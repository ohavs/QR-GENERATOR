import { motion } from 'framer-motion';
import { AlertTriangle, FileArchive, FileText, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Divider, Pills, Section, Toggle } from '../ui/controls';
import { cn } from '@/lib/cn';
import { MAX_BATCH, parseBatch, type BatchRow } from '@/lib/batch/csv';
import type { BatchFailure } from '@/lib/batch/generate';
import {
  DEFAULT_SHEET,
  layoutSheet,
  MIN_MODULE_MM,
  moduleMillimeters,
  SHEET_BY_ID,
  SHEET_PRESETS,
} from '@/lib/batch/sheet';
import { download } from '@/lib/export';
import { springSnappy } from '@/lib/motion';
import { frameHeight } from '@/lib/qr/geometry';
import type { QrGeometry } from '@/lib/qr/types';

type Output = 'sheet' | 'zip';

const ZIP_SIZES = [
  { value: 512, label: '512 פיקסל' },
  { value: 1024, label: '1024 פיקסל' },
  { value: 2048, label: '2048 פיקסל' },
];

const PLACEHOLDER = `https://example.com/1, שולחן 1
https://example.com/2, שולחן 2
https://example.com/3, שולחן 3`;

interface BatchSheetProps {
  open: boolean;
  onClose: () => void;
  /** בונה קוד בערך אחר עם הגדרות העיצוב הנוכחיות */
  buildWith: (value: string, frameText?: string | null) => QrGeometry;
  /** רוחב הלוח ביחידות מודול, מהקוד שמוצג כרגע — בסיס לאזהרת הקריאות */
  boardSize: number | null;
  onError: (message: string) => void;
  onInfo: (message: string) => void;
}

/**
 * ייצור באצווה.
 *
 * שתי תוצאות אפשריות ולא אחת: מי שמדפיס רוצה גיליון A4 מסודר עם קווי חיתוך,
 * ומי שמשלב את הקודים במערכת אחרת רוצה קובצי PNG נפרדים. אותו צינור רינדור
 * משרת את שניהם, ולכן שני היעדים לעולם לא ייראו שונה זה מזה.
 */
export function BatchSheet({
  open,
  onClose,
  buildWith,
  boardSize,
  onError,
  onInfo,
}: BatchSheetProps): ReactNode {
  const [text, setText] = useState('');
  const [output, setOutput] = useState<Output>('sheet');
  const [presetId, setPresetId] = useState(DEFAULT_SHEET.id);
  const [zipSize, setZipSize] = useState(1024);
  const [withLabels, setWithLabels] = useState(true);
  const [guides, setGuides] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<BatchFailure[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const parsed = useMemo(() => parseBatch(text), [text]);
  const rows: BatchRow[] = useMemo(() => parsed.rows.slice(0, MAX_BATCH), [parsed.rows]);
  const overflow = parsed.rows.length - rows.length;

  const preset = SHEET_BY_ID.get(presetId) ?? DEFAULT_SHEET;

  // הכיתוב מוסיף גובה ללוח, ולכן משנה את גודל התא — הערך המוצג חייב להביא את
  // זה בחשבון, אחרת המשתמש בוחר צפיפות לפי מספר שלא יתקיים
  const ratio = useMemo(() => {
    if (!withLabels || !boardSize) return 1;
    return (boardSize + frameHeight(boardSize)) / boardSize;
  }, [withLabels, boardSize]);

  const layout = useMemo(() => layoutSheet(preset, ratio), [preset, ratio]);
  const pageCount = Math.max(1, Math.ceil(rows.length / layout.perPage));
  const moduleMm = boardSize ? moduleMillimeters(layout.cellWidthMm, boardSize) : null;

  const pickFile = useCallback(
    async (file: File) => {
      try {
        setText(await file.text());
      } catch {
        onError('קריאת הקובץ נכשלה');
      }
    },
    [onError],
  );

  const run = useCallback(async () => {
    if (rows.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setFailures([]);
    setProgress({ done: 0, total: rows.length });

    const input = {
      rows,
      build: (row: BatchRow) => buildWith(row.value, withLabels ? row.label || null : null),
      onProgress: (done: number, total: number) => setProgress({ done, total }),
      signal: controller.signal,
    };

    try {
      // הצינור נטען לפי דרישה: כותב ה-ZIP, כותב ה-PDF והרנדרר הם משקל מיותר
      // למי שרק מייצר קוד בודד — כלומר לרוב המוחלט של הפתיחות
      const { buildBatchSheet, buildBatchZip } = await import('@/lib/batch/generate');
      const result =
        output === 'zip'
          ? await buildBatchZip(input, zipSize)
          : await buildBatchSheet(input, preset, guides);

      download(result.blob, result.filename);
      setFailures(result.failures);
      onInfo(
        result.failures.length
          ? `הופקו ${result.produced} קודים · ${result.failures.length} נכשלו`
          : `הופקו ${result.produced} קודים`,
      );
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        onError(error instanceof Error ? error.message : 'הייצור נכשל');
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  }, [rows, buildWith, withLabels, output, zipSize, preset, guides, onError, onInfo]);

  const busy = progress !== null;
  const percent = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ייצור באצווה"
      subtitle={rows.length ? `${rows.length} קודים` : 'רשימה אחת, כל הקודים בבת אחת'}
      footer={
        busy ? (
          <div className="space-y-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${percent}%` }}
                transition={springSnappy}
              />
            </div>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[0.8125rem] text-fg-muted">
                {progress.done} מתוך {progress.total}
              </p>
              <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ink"
            size="lg"
            block
            disabled={rows.length === 0}
            onClick={() => void run()}
            icon={output === 'zip' ? <FileArchive size={18} /> : <FileText size={18} />}
          >
            {output === 'zip'
              ? `הורדת ${rows.length} קבצים בארכיון`
              : pageCount === 1
                ? 'הורדת גיליון A4'
                : `הורדת ${pageCount} עמודי A4`}
          </Button>
        )
      }
    >
      {/* ── הרשימה ─────────────────────────────────────────────── */}
      <Section
        title="הרשימה"
        hint="ערך בכל שורה. אפשר להוסיף כיתוב אחרי פסיק, או להעלות קובץ CSV מגיליון."
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          dir="auto"
          spellCheck={false}
          placeholder={PLACEHOLDER}
          className="w-full resize-y rounded-[var(--radius-control)] border border-border bg-surface p-3 text-[0.8125rem] leading-relaxed outline-none transition-colors placeholder:text-fg-subtle focus:border-fg"
        />

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            icon={<Upload size={15} />}
            onClick={() => fileRef.current?.click()}
          >
            העלאת קובץ
          </Button>
          {text && (
            <Button variant="ghost" size="sm" onClick={() => setText('')}>
              ניקוי
            </Button>
          )}
        </div>

        {parsed.usedHeader && (
          <p className="px-1 text-[0.75rem] text-fg-subtle">
            השורה הראשונה זוהתה ככותרת ולא נכללת בייצור
          </p>
        )}
        {parsed.skipped > 0 && (
          <p className="px-1 text-[0.75rem] text-fg-subtle">
            {parsed.skipped} שורות ריקות דולגו
          </p>
        )}
        {overflow > 0 && (
          <p className="px-1 text-[0.75rem] font-semibold text-warning">
            מיוצרים {MAX_BATCH} הראשונים; {overflow} הנותרים ידרשו הרצה נוספת
          </p>
        )}
      </Section>

      {rows.length > 0 && (
        <>
          <Divider />

          {/* ── פלט ──────────────────────────────────────────── */}
          <Section title="מה להוריד">
            <Pills
              label="סוג הפלט"
              layout="grid"
              columns={2}
              value={output}
              onChange={setOutput}
              options={[
                { value: 'sheet', label: 'גיליון להדפסה' },
                { value: 'zip', label: 'קבצים נפרדים' },
              ]}
            />

            {output === 'sheet' ? (
              <div className="space-y-2.5 pt-1">
                <Pills
                  label="צפיפות בעמוד"
                  layout="grid"
                  columns={2}
                  value={presetId}
                  onChange={setPresetId}
                  options={SHEET_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
                />
                <p className="px-1 text-[0.75rem] text-fg-muted">
                  {preset.hint} · כל קוד {layout.cellWidthMm.toFixed(0)} מ״מ ·{' '}
                  {pageCount === 1 ? 'עמוד אחד' : `${pageCount} עמודים`}
                </p>
                {moduleMm !== null && moduleMm < MIN_MODULE_MM && (
                  <p className="flex items-start gap-1.5 px-1 text-[0.75rem] text-warning">
                    <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
                    כל ריבוע בקוד יוצא {moduleMm.toFixed(2)} מ״מ — קטן מהמומלץ להדפסה. כדאי לקצר
                    את הכתובות, לבחור פחות קודים בעמוד, או לבדוק קוד אחד לפני שמדפיסים הכול.
                  </p>
                )}
                <Toggle
                  checked={guides}
                  onChange={setGuides}
                  label="קווי חיתוך"
                  description="מסגרת מקווקוות סביב כל קוד, לגזירה מדויקת"
                />
              </div>
            ) : (
              <div className="pt-1">
                <Pills
                  label="גודל כל קובץ"
                  layout="grid"
                  columns={3}
                  value={zipSize}
                  onChange={setZipSize}
                  options={ZIP_SIZES}
                />
              </div>
            )}
          </Section>

          <Divider />

          <Section title="כיתוב">
            <Toggle
              checked={withLabels}
              onChange={setWithLabels}
              label="כיתוב מתחת לכל קוד"
              description="הטקסט מהעמודה השנייה — מה שמבדיל בין מדבקה למדבקה אחרי הגזירה"
            />
          </Section>

          <Divider />

          {/* ── תצוגה מקדימה של הרשימה ──────────────────────── */}
          <Section title="בדיקה אחרונה">
            <ul className="overflow-hidden rounded-[var(--radius-tile)] border border-border [&>*+*]:border-t [&>*+*]:border-border">
              {rows.slice(0, 4).map((row, index) => (
                <li key={index} className="flex items-center gap-2 px-3 py-2 text-[0.75rem]">
                  <span className="w-5 shrink-0 text-fg-subtle">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium" dir="auto">
                    {row.value}
                  </span>
                  {withLabels && row.label && (
                    <span className="shrink-0 truncate text-fg-muted">{row.label}</span>
                  )}
                </li>
              ))}
              {rows.length > 4 && (
                <li className="px-3 py-2 text-[0.75rem] text-fg-subtle">
                  ועוד {rows.length - 4}…
                </li>
              )}
            </ul>
          </Section>
        </>
      )}

      {failures.length > 0 && (
        <div
          className={cn(
            'mt-2 rounded-[var(--radius-tile)] border border-danger/40 bg-danger/10 p-3',
            'text-[0.75rem] leading-relaxed',
          )}
        >
          <p className="font-bold">{failures.length} שורות לא נוצרו</p>
          <ul className="mt-1 space-y-0.5 text-fg-muted">
            {failures.slice(0, 5).map((failure) => (
              <li key={failure.index} className="truncate">
                שורה {failure.index + 1}: {failure.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
