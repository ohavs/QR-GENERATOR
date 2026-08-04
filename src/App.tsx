import { Palette, Ruler, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CustomizePanel } from './components/CustomizePanel';
import { DesignGallery } from './components/DesignGallery';
import { ExportBar } from './components/ExportBar';
import { Header } from './components/Header';
import { HistoryStrip } from './components/HistoryStrip';
import { MobileActionBar } from './components/MobileActionBar';
import { QrPreview } from './components/QrPreview';
import { SizePicker } from './components/SizePicker';
import { UpdatePrompt } from './components/UpdatePrompt';
import { UrlInput } from './components/UrlInput';
import { Segmented } from './components/ui/Field';
import { useExportActions } from './hooks/useExportActions';
import { useQrStudio } from './hooks/useQrStudio';
import { useScanCheck } from './hooks/useScanCheck';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { checkScanContrast } from './lib/contrast';
import { track } from './lib/firebase';
import { paintToColor } from './lib/qr/render/common';
import {
  clearHistory,
  loadHistory,
  pushHistory,
  removeHistory,
  type HistoryEntry,
} from './lib/storage';

type Tab = 'designs' | 'customize' | 'sizes';

const TABS: Array<{ value: Tab; label: string; icon: ReactNode }> = [
  { value: 'designs', label: 'עיצובים', icon: <Palette size={15} aria-hidden /> },
  { value: 'customize', label: 'התאמה', icon: <SlidersHorizontal size={15} aria-hidden /> },
  { value: 'sizes', label: 'גודל', icon: <Ruler size={15} aria-hidden /> },
];

export default function App(): ReactNode {
  const studio = useQrStudio();
  const { isDark, toggle, mode } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('designs');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const lastTracked = useRef('');

  const { state, patch, design, size, geometry, error, encodedValue } = studio;
  const scanCheck = useScanCheck(geometry, encodedValue);
  const contrast = useMemo(
    () =>
      checkScanContrast(
        state.bodyOverride ?? design.body,
        state.transparent ? null : (state.backgroundOverride ?? design.background),
      ),
    [state.bodyOverride, state.backgroundOverride, state.transparent, design],
  );

  // מדידה חד-פעמית לכל ערך שנוצר בהצלחה
  useEffect(() => {
    if (!geometry || !encodedValue || lastTracked.current === encodedValue) return;
    lastTracked.current = encodedValue;
    void track('qr_generated', { design: design.id, modules: geometry.moduleCount });
  }, [geometry, encodedValue, design.id]);

  // קבלת קישור משותף מהמערכת (Web Share Target) או מפרמטר בכתובת
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('url') ?? params.get('text') ?? params.get('v');
    if (shared) {
      patch({ input: shared });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [patch]);

  const rememberCurrent = useCallback(() => {
    if (!encodedValue) return;
    setHistory(
      pushHistory({
        value: encodedValue,
        designId: design.id,
        swatch: paintToColor(state.bodyOverride ?? design.body),
      }),
    );
  }, [encodedValue, design, state.bodyOverride]);

  const exportActions = useExportActions({
    geo: geometry,
    size,
    design,
    value: encodedValue,
    transparent: state.transparent,
    onExported: rememberCurrent,
  });

  const restore = useCallback(
    (entry: HistoryEntry) => {
      patch({ input: entry.value, designId: entry.designId });
      void track('history_restored');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [patch],
  );

  return (
    <div className="aurora-bg relative min-h-dvh">
      <Header isDark={isDark} onToggleTheme={toggle} mode={mode} />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-10 lg:pb-16">
        <section className="mb-6 space-y-4 sm:mb-8">
          <div className="space-y-1.5 text-center sm:text-start">
            <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              מחוללים קוד QR מעוצב
            </h1>
            <p className="text-sm text-fg-muted sm:text-base">
              הדביקו קישור, בחרו עיצוב וגודל — והורידו כתמונה או PDF. הכול קורה בדפדפן, בלי שהקישור
              שלכם נשלח לשום שרת.
            </p>
          </div>

          <UrlInput
            value={state.input}
            onChange={(input) => patch({ input })}
            note={studio.inputNote}
            error={error}
          />

          <HistoryStrip
            entries={history}
            onRestore={restore}
            onRemove={(id) => setHistory(removeHistory(id))}
            onClear={() => {
              clearHistory();
              setHistory([]);
            }}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          {/* ── לוח הבקרה ─────────────────────────────────── */}
          <div className="order-2 space-y-4 lg:order-1">
            <Segmented aria-label="מה מתאימים" options={TABS} value={tab} onChange={setTab} />

            <div key={tab} className="animate-in-up card p-4 sm:p-5">
              {tab === 'designs' && (
                <DesignGallery
                  selectedId={state.designId}
                  buildPreview={studio.buildPreview}
                  onSelect={(d) => {
                    patch({ designId: d.id, ecLevel: state.logo ? 'H' : d.ecLevel });
                    void track('design_selected', { design: d.id });
                  }}
                />
              )}

              {tab === 'customize' && (
                <CustomizePanel
                  state={state}
                  design={design}
                  patch={patch}
                  onResetCustomizations={studio.resetCustomizations}
                  onLogoError={toast.error}
                />
              )}

              {tab === 'sizes' && (
                <SizePicker
                  value={state.sizeId}
                  onChange={(s) => {
                    patch({ sizeId: s.id });
                    void track('size_selected', { size: s.id });
                  }}
                />
              )}
            </div>
          </div>

          {/* ── תצוגה מקדימה + ייצוא ──────────────────────── */}
          <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2">
            <div id="qr-preview-anchor" aria-hidden />
            <QrPreview
              geo={geometry}
              error={error}
              isEmpty={studio.isEmpty}
              transparent={state.transparent}
              designName={design.name}
              size={size}
              value={encodedValue}
              scanCheck={scanCheck}
              contrast={contrast}
              animationKey={`${design.id}-${state.moduleShape}-${state.transparent}`}
            />

            <div className="card space-y-3 p-4">
              <ExportBar actions={exportActions} transparent={state.transparent} />
            </div>
          </aside>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs leading-relaxed text-fg-subtle">
          <p>
            הקודים נוצרים במלואם במכשיר שלכם. אין העלאה של קישורים, לוגואים או תמונות לשרת.
          </p>
          <p className="mt-1">QR Studio · נבנה עם ❤️ בעברית</p>
        </footer>
      </main>

      <MobileActionBar
        geo={geometry}
        designName={design.name}
        busy={exportActions.busy === 'download'}
        onDownload={() => void exportActions.runDownload()}
      />

      <UpdatePrompt />
    </div>
  );
}
