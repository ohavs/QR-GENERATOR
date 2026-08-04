import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, ScanLine, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { QrSvg } from './QrSvg';
import { ScanStatus } from './ScanStatus';
import { cn } from '@/lib/cn';
import type { ScanContrast } from '@/lib/contrast';
import type { QrGeometry } from '@/lib/qr/types';
import { describeSize, type SizePreset } from '@/lib/sizes';
import { shortenForDisplay } from '@/lib/url';
import type { ScanCheckState } from '@/hooks/useScanCheck';

interface QrPreviewProps {
  geo: QrGeometry | null;
  error: string | null;
  isEmpty: boolean;
  transparent: boolean;
  designName: string;
  size: SizePreset;
  value: string;
  scanCheck: ScanCheckState;
  contrast: ScanContrast;
  /** מפתח שמשתנה בכל החלפת עיצוב — מפעיל את אנימציית המעבר */
  animationKey: string;
}

export function QrPreview({
  geo,
  error,
  isEmpty,
  transparent,
  designName,
  size,
  value,
  scanCheck,
  contrast,
  animationKey,
}: QrPreviewProps): ReactNode {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ScanLine size={16} className="shrink-0 text-primary" aria-hidden />
          <h2 className="truncate text-sm font-bold">תצוגה מקדימה</h2>
        </div>
        {geo && (
          <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 font-mono text-[11px] text-fg-muted tabular-nums">
            {describeSize(size, geo.boardHeight / geo.boardSize)}
          </span>
        )}
      </div>

      <div
        className={cn(
          'relative grid place-items-center p-5 sm:p-7',
          transparent && geo && 'checkerboard',
        )}
      >
        <div className="w-full max-w-[19rem]">
          <AnimatePresence mode="wait" initial={false}>
            {geo ? (
              <motion.div
                key={animationKey}
                initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(2px)' }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="drop-shadow-[0_12px_28px_rgb(15_23_42_/_0.14)]"
              >
                <QrSvg geo={geo} title={`קוד QR עבור ${value}`} className="w-full" />
              </motion.div>
            ) : (
              <motion.div
                key={error ? 'error' : 'empty'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 text-center"
              >
                {error ? (
                  <>
                    <TriangleAlert size={30} className="text-danger" aria-hidden />
                    <p className="text-sm font-medium leading-relaxed text-fg-muted">{error}</p>
                  </>
                ) : (
                  <>
                    <QrCode size={34} className="text-fg-subtle" aria-hidden />
                    <p className="text-sm font-medium text-fg-muted">
                      {isEmpty ? 'הדביקו קישור למעלה והקוד ייווצר מיד' : 'מחשבים…'}
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {geo && (
        <>
          <ScanStatus check={scanCheck} contrast={contrast} />
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-2.5">
            <span className="truncate text-xs text-fg-muted" dir="ltr">
              {shortenForDisplay(value, 34)}
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary">{designName}</span>
          </div>
        </>
      )}
    </div>
  );
}
