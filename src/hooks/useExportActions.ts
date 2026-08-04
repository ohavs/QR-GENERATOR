import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './useToast';
import {
  buildExport,
  copyPngToClipboard,
  download,
  shareFile,
  suggestFilename,
  toAsciiFilename,
  toPngBlob,
  type ExportFormat,
} from '@/lib/export';
import { track } from '@/lib/firebase';
import type { QrDesign, QrGeometry } from '@/lib/qr/types';
import type { SizePreset } from '@/lib/sizes';

export type ExportBusy = null | 'download' | 'share' | 'copy';

export interface ExportActions {
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  /** שם הקובץ כפי שהמשתמש הקליד, ללא סיומת */
  fileName: string;
  setFileName: (name: string) => void;
  /** השם שיישמר בפועל — מתועתק ל-ASCII. שונה מ-`fileName` כשהוקלדה עברית. */
  resolvedFileName: string;
  busy: ExportBusy;
  disabled: boolean;
  runDownload: () => Promise<void>;
  runShare: () => Promise<void>;
  runCopy: () => Promise<void>;
}



interface Params {
  geo: QrGeometry | null;
  size: SizePreset;
  design: QrDesign;
  value: string;
  transparent: boolean;
  onExported: () => void;
}

/**
 * פעולות הייצוא במקום אחד.
 *
 * הן משותפות לסרגל הייצוא בצד ולסרגל הפעולה בנייד, כדי שלא ייווצרו שני
 * מסלולי הורדה שיכולים להתפצל בהתנהגות.
 */
export function useExportActions({
  geo,
  size,
  design,
  value,
  transparent,
  onExported,
}: Params): ExportActions {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [busy, setBusy] = useState<ExportBusy>(null);
  const [fileName, setFileNameState] = useState('');
  const touched = useRef(false);

  const suggested = suggestFilename(value, design.id);

  // השם המוצע מתעדכן עם התוכן והעיצוב — אבל רק עד שהמשתמש נגע בו
  useEffect(() => {
    if (!touched.current) setFileNameState(suggested);
  }, [suggested]);

  const setFileName = useCallback((next: string) => {
    touched.current = true;
    setFileNameState(next);
  }, []);

  const name = toAsciiFilename(fileName) || suggested;
  const title = `קוד QR — ${value}`;

  const runDownload = useCallback(async () => {
    if (!geo) return;
    setBusy('download');
    try {
      const { blob, filename } = await buildExport({ geo, size, format, name, title, transparent });
      download(blob, filename);
      void track('export_download', { format, size: size.id, design: design.id });
      onExported();
      toast.success(`הקובץ ${filename} ירד למכשיר`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'הייצוא נכשל. נסו שוב.');
    } finally {
      setBusy(null);
    }
  }, [geo, size, format, name, title, transparent, design.id, onExported, toast]);

  const runShare = useCallback(async () => {
    if (!geo) return;
    // SVG לא נתמך בתפריט השיתוף של רוב המכשירים — משתפים PNG במקומו
    const shareFormat: ExportFormat = format === 'svg' ? 'png' : format;
    setBusy('share');
    try {
      const { blob, filename } = await buildExport({
        geo,
        size,
        format: shareFormat,
        name,
        title,
        transparent,
      });
      const result = await shareFile(blob, filename, 'קוד QR');
      if (result === 'shared') {
        void track('export_share', { format: shareFormat, size: size.id, design: design.id });
        onExported();
        toast.success('הקוד שותף');
      } else if (result === 'unsupported') {
        download(blob, filename);
        toast.info('השיתוף אינו נתמך בדפדפן הזה — הקובץ ירד במקום');
      }
    } catch {
      toast.error('השיתוף נכשל. נסו להוריד את הקובץ.');
    } finally {
      setBusy(null);
    }
  }, [geo, size, format, name, title, transparent, design.id, onExported, toast]);

  const runCopy = useCallback(async () => {
    if (!geo) return;
    setBusy('copy');
    try {
      const blob = await toPngBlob(geo, size, transparent);
      const ok = await copyPngToClipboard(blob);
      if (ok) {
        void track('export_copy', { size: size.id, design: design.id });
        toast.success('התמונה הועתקה — אפשר להדביק ישירות');
      } else {
        toast.info('הדפדפן לא מאפשר העתקת תמונות. השתמשו בהורדה או בשיתוף.');
      }
    } catch {
      toast.error('ההעתקה נכשלה');
    } finally {
      setBusy(null);
    }
  }, [geo, size, transparent, design.id, toast]);

  return {
    format,
    setFormat,
    fileName,
    setFileName,
    resolvedFileName: name,
    busy,
    disabled: !geo,
    runDownload,
    runShare,
    runCopy,
  };
}
