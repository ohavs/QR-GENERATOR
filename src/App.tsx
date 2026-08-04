import { motion } from 'framer-motion';
import { IdCard, Link2, Palette, Ruler, Sparkles, Type } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExportDock } from './components/ExportDock';
import { Header } from './components/Header';
import { HistoryRail } from './components/HistoryRail';
import { InstallSheet } from './components/InstallSheet';
import { QrPreview } from './components/QrPreview';
import { UpdatePrompt } from './components/UpdatePrompt';
import { ContentInput } from './components/ContentInput';
import { BrandSheet } from './components/sheets/BrandSheet';
import { DesignSheet } from './components/sheets/DesignSheet';
import { CardSheet } from './components/sheets/CardSheet';
import { DynamicSheet } from './components/sheets/DynamicSheet';
import { ExportSheet, type ExportMode } from './components/sheets/ExportSheet';
import { SizeSheet } from './components/sheets/SizeSheet';
import { StyleSheet } from './components/sheets/StyleSheet';
import { RowGroup, SettingRow } from './components/ui/controls';
import { paintToCss } from './components/ui/ColorField';
import { useAuth } from './hooks/useAuth';
import { useExportActions } from './hooks/useExportActions';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useQrStudio } from './hooks/useQrStudio';
import { useScanCheck } from './hooks/useScanCheck';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { checkScanContrast } from './lib/contrast';
import { track } from './lib/firebase';
import { listItem, listParent } from './lib/motion';
import { CONTENT_TYPES } from './lib/qr/content';
import { labelFor, DOT_SCALES, MODULE_SHAPES } from './lib/qr/options';
import { paintToColor } from './lib/qr/render/common';
import { DEFAULT_TEMPLATE, TEMPLATE_BY_ID } from './lib/cards/templates';
import type { CardState } from './lib/cards/types';
import { linkUrl } from './lib/dynamic';
import { loadHistory, pushHistory, removeHistory, type HistoryEntry } from './lib/storage';

type SheetName =
  | 'design'
  | 'style'
  | 'brand'
  | 'size'
  | 'install'
  | 'export'
  | 'dynamic'
  | 'card'
  | null;

export default function App(): ReactNode {
  const studio = useQrStudio();
  const { isDark, toggle } = useTheme();
  const toast = useToast();
  const install = useInstallPrompt();
  const auth = useAuth();

  const [sheet, setSheet] = useState<SheetName>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('download');
  const [card, setCard] = useState<CardState>({
    templateId: DEFAULT_TEMPLATE.id,
    values: {},
    qrOverride: null,
  });
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const lastTracked = useRef('');
  const installOffered = useRef(false);

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

  const rememberCurrent = useCallback(() => {
    if (!encodedValue) return;
    setHistory(
      pushHistory({
        value: encodedValue,
        kind: state.contentKind,
        values: state.contentValues[state.contentKind] ?? {},
        designId: design.id,
        swatch: paintToColor(state.bodyOverride ?? design.body),
      }),
    );
  }, [encodedValue, design, state.bodyOverride, state.contentKind, state.contentValues]);

  const exportActions = useExportActions({
    geo: geometry,
    size,
    design,
    value: encodedValue,
    transparent: state.transparent,
    onExported: rememberCurrent,
  });

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
      studio.loadContent('link', { url: shared });
      window.history.replaceState({}, '', window.location.pathname);
    }
    // כוונה: פעם אחת בעלייה בלבד
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // הצעת ההתקנה מגיעה רק אחרי שכבר נוצר קוד — לפני זה אין למשתמש סיבה להסכים
  useEffect(() => {
    if (installOffered.current || !geometry) return;
    if (!install.available || install.dismissed || install.installed) return;
    installOffered.current = true;
    const timer = setTimeout(() => setSheet((current) => current ?? 'install'), 2600);
    return () => clearTimeout(timer);
  }, [geometry, install.available, install.dismissed, install.installed]);

  const restore = useCallback(
    (entry: HistoryEntry) => {
      studio.loadContent(entry.kind, entry.values);
      patch({ designId: entry.designId });
      void track('history_restored');
    },
    [patch, studio],
  );

  const closeSheet = useCallback(() => setSheet(null), []);

  const shapeLabel =
    MODULE_SHAPES.find((s) => s.value === (state.moduleShape ?? design.moduleShape))?.label ?? '';
  const brandParts = [
    state.logo ? 'לוגו' : null,
    state.frameEnabled && state.frameText.trim() ? state.frameText.trim() : null,
  ].filter(Boolean);

  return (
    <div className="min-h-dvh">
      <Header isDark={isDark} onToggleTheme={toggle} />

      <main className="mx-auto max-w-[30rem] px-4 pb-2">
        <motion.div variants={listParent} initial="hidden" animate="show" className="space-y-4">
          <motion.div variants={listItem} className="pt-1">
            <h1 className="text-[1.375rem] font-extrabold leading-tight">קוד QR מעוצב</h1>
            <p className="mt-0.5 text-[0.8125rem] text-fg-muted">
              הדביקו קישור, בחרו עיצוב, והורידו
            </p>
          </motion.div>

          <motion.div variants={listItem}>
            <ContentInput
              kind={state.contentKind}
              values={state.contentValues[state.contentKind] ?? {}}
              onKindChange={(kind) => patch({ contentKind: kind })}
              onFieldChange={studio.setField}
              note={studio.inputNote}
              error={error}
            />
          </motion.div>

          <motion.div variants={listItem}>
            <QrPreview
              geo={geometry}
              error={error}
              isEmpty={studio.isEmpty}
              transparent={state.transparent}
              scanCheck={scanCheck}
              contrast={contrast}
              animationKey={`${design.id}-${state.moduleShape}-${state.transparent}-${state.frameEnabled}`}
              compact={CONTENT_TYPES[state.contentKind].fields.length > 2}
            />
          </motion.div>

          <motion.div variants={listItem}>
            <RowGroup>
              <SettingRow
                icon={<Sparkles size={18} aria-hidden />}
                label="עיצוב"
                value={design.name}
                onClick={() => setSheet('design')}
              />
              <SettingRow
                icon={<Palette size={18} aria-hidden />}
                label="צבעים וצורות"
                value={`${shapeLabel} · ${labelFor(DOT_SCALES, state.dotScale ?? design.dotScale)}`}
                onClick={() => setSheet('style')}
                trailing={
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                    style={{ background: paintToCss(state.bodyOverride ?? design.body) }}
                    aria-hidden
                  />
                }
              />
              <SettingRow
                icon={<Type size={18} aria-hidden />}
                label="לוגו וכיתוב"
                value={brandParts.length ? brandParts.join(' · ') : 'ללא'}
                onClick={() => setSheet('brand')}
              />
              <SettingRow
                icon={<Ruler size={18} aria-hidden />}
                label="גודל"
                value={`${size.label} · ${size.hint}`}
                onClick={() => setSheet('size')}
              />
              <SettingRow
                icon={<IdCard size={18} aria-hidden />}
                label="כרטיסייה מעוצבת"
                value={
                  TEMPLATE_BY_ID.get(card.templateId)?.name
                    ? `${TEMPLATE_BY_ID.get(card.templateId)!.name} · כרטיס להדפסה`
                    : 'כרטיס ביקור, שלט או מדבקה'
                }
                onClick={() => setSheet('card')}
              />
              <SettingRow
                icon={<Link2 size={18} aria-hidden />}
                label="קוד דינמי"
                value={
                  state.dynamic
                    ? `פעיל · ${state.dynamic.title}`
                    : 'החלפת יעד אחרי הדפסה, ומדידת סריקות'
                }
                onClick={() => setSheet('dynamic')}
              />
            </RowGroup>
          </motion.div>

          {history.length > 0 && (
            <motion.div variants={listItem}>
              <HistoryRail
                entries={history}
                onRestore={restore}
                onRemove={(id) => setHistory(removeHistory(id))}
              />
            </motion.div>
          )}
        </motion.div>

        <ExportDock
          actions={exportActions}
          onOpenExport={(mode) => {
            setExportMode(mode);
            setSheet('export');
          }}
        />

        <footer className="pb-6 pt-4 text-center text-xs leading-relaxed text-fg-subtle">
          הקודים נוצרים במלואם במכשיר שלכם — קישורים, לוגואים ותמונות לא נשלחים לשום שרת.
        </footer>
      </main>

      <DesignSheet
        open={sheet === 'design'}
        onClose={closeSheet}
        selectedId={state.designId}
        buildPreview={studio.buildPreview}
        onSelect={(d) => {
          patch({ designId: d.id, ecLevel: state.logo ? 'H' : d.ecLevel });
          void track('design_selected', { design: d.id });
        }}
      />

      <StyleSheet
        open={sheet === 'style'}
        onClose={closeSheet}
        state={state}
        design={design}
        patch={patch}
        onReset={studio.resetCustomizations}
      />

      <BrandSheet
        open={sheet === 'brand'}
        onClose={closeSheet}
        state={state}
        design={design}
        patch={patch}
        onError={toast.error}
        onInfo={toast.info}
      />

      <SizeSheet
        open={sheet === 'size'}
        onClose={closeSheet}
        value={state.sizeId}
        onChange={(s) => {
          patch({ sizeId: s.id });
          void track('size_selected', { size: s.id });
        }}
      />

      <CardSheet
        open={sheet === 'card'}
        onClose={closeSheet}
        geometry={geometry}
        state={card}
        onChange={setCard}
        onError={toast.error}
        fileName={exportActions.resolvedFileName}
      />

      <DynamicSheet
        open={sheet === 'dynamic'}
        onClose={closeSheet}
        auth={auth}
        suggestedTarget={state.dynamic ? '' : encodedValue}
        activeId={state.dynamic?.id ?? null}
        onUse={(link) =>
          patch({
            dynamic: link
              ? { id: link.id, url: linkUrl(link.id), title: link.title || link.target }
              : null,
          })
        }
        onError={toast.error}
      />

      <ExportSheet
        open={sheet === 'export'}
        mode={exportMode}
        onClose={closeSheet}
        actions={exportActions}
        transparent={state.transparent}
        size={size}
      />

      <InstallSheet
        open={sheet === 'install'}
        manual={install.manual}
        onClose={() => {
          install.dismiss();
          closeSheet();
        }}
        onInstall={() => {
          void install.install().then((accepted) => {
            if (accepted) void track('pwa_installed');
            closeSheet();
          });
        }}
      />

      <UpdatePrompt />
    </div>
  );
}
