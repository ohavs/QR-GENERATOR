import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ExternalLink,
  Link2,
  Loader2,
  Lock,
  Pencil,
  Power,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Divider, Section } from '../ui/controls';
import { cn } from '@/lib/cn';
import { fade, listItem, listParent, springSnappy } from '@/lib/motion';
import {
  createLink,
  deleteLink,
  linkUrl,
  listLinks,
  listScans,
  summarizeScans,
  updateLink,
  type DynamicLink,
} from '@/lib/dynamic';
import type { AuthState } from '@/hooks/useAuth';

const SETUP_DOCS = 'https://console.firebase.google.com/project/qr-generator-92987/firestore';

interface DynamicSheetProps {
  open: boolean;
  onClose: () => void;
  auth: AuthState;
  /** היעד שמוצע כברירת מחדל — מה שכבר מוקלד במסך הראשי */
  suggestedTarget: string;
  /** הקוד הדינמי שנבחר כרגע להצגה */
  activeId: string | null;
  onUse: (link: DynamicLink | null) => void;
  onError: (message: string) => void;
  /** מדווח האם למשתמש יש קודים — קובע אם להציג אזהרת תפוגה */
  onLinksLoaded?: (has: boolean) => void;
}

/**
 * ניהול הקודים הדינמיים.
 *
 * זהו המקום היחיד באפליקציה שבו מידע עוזב את המכשיר, ולכן הוא נפרד לגמרי
 * ממסלול הקוד הרגיל ודורש בחירה מפורשת: התחברות, ואז יצירה.
 */
export function DynamicSheet({
  open,
  onClose,
  auth,
  suggestedTarget,
  activeId,
  onUse,
  onError,
  onLinksLoaded,
}: DynamicSheetProps): ReactNode {
  const [links, setLinks] = useState<DynamicLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [statsFor, setStatsFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.user) return;
    setLoading(true);
    try {
      const loaded = await listLinks(auth.user.uid);
      setLinks(loaded);
      onLinksLoaded?.(loaded.length > 0);
    } catch {
      // מצב "לא מופעל" מטופל בתצוגה; תקלה זמנית פשוט משאירה רשימה ריקה
    } finally {
      setLoading(false);
    }
  }, [auth.user, onLinksLoaded]);

  useEffect(() => {
    if (open && auth.user) void refresh();
  }, [open, auth.user, refresh]);

  useEffect(() => {
    if (open) setTarget(suggestedTarget);
  }, [open, suggestedTarget]);

  const handleCreate = useCallback(async () => {
    if (!auth.user || !target.trim()) return;
    setBusy(true);
    try {
      const link = await createLink({
        target,
        title: title.trim() || target.trim(),
        ownerId: auth.user.uid,
      });
      setLinks((prev) => [link, ...prev]);
      onLinksLoaded?.(true);
      setTitle('');
      onUse(link);
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'יצירת הקוד נכשלה');
    } finally {
      setBusy(false);
    }
  }, [auth.user, target, title, onUse, onClose, onError, onLinksLoaded]);

  /* ── הצד השרתי לא הופעל ─────────────────────────────────────── */
  if (auth.unavailable) {
    return (
      <Sheet open={open} onClose={onClose} title="קודים דינמיים" subtitle="עדיין לא הופעלו">
        <Section title="מה חסר">
          <p className="text-[0.875rem] leading-relaxed text-fg-muted">
            קודים דינמיים דורשים מסד נתונים ופונקציית הפניה בצד השרת. הם מוגדרים בפרויקט אבל
            עדיין לא הופעלו בקונסולה.
          </p>
          <a
            href={SETUP_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 rounded-[var(--radius-tile)] border border-border p-3 text-[0.875rem] font-semibold transition-colors hover:border-fg"
          >
            <ExternalLink size={16} className="shrink-0 text-accent" aria-hidden />
            פתיחת הקונסולה להפעלה
          </a>
          <p className="mt-2 text-xs leading-relaxed text-fg-subtle">
            ההוראות המלאות נמצאות בקובץ SETUP.md במאגר.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* ── לא מחובר ────────────────────────────────────────────────── */
  if (!auth.user) {
    return (
      <Sheet open={open} onClose={onClose} title="קודים דינמיים" subtitle="נדרשת התחברות">
        <Section title="למה צריך חשבון">
          <p className="text-[0.875rem] leading-relaxed text-fg-muted">
            קוד דינמי נשמר בענן כדי שתוכלו לשנות את היעד שלו אחרי שהוא כבר הודפס. החשבון קובע
            למי הקוד שייך.
          </p>
        </Section>

        <div className="space-y-2 pb-2">
          <Button
            variant="ink"
            size="lg"
            block
            onClick={() =>
              void auth
                .signInWithGoogle()
                .then((result) => {
                  if (result === 'switched') {
                    onError('חשבון הגוגל כבר בשימוש. הקודים האנונימיים נשארו בחשבון הקודם.');
                  }
                })
                .catch(() => onError('ההתחברות נכשלה'))
            }
          >
            התחברות עם גוגל
          </Button>
          <Button
            variant="soft"
            size="lg"
            block
            onClick={() => void auth.signInAnonymously().catch(() => onError('ההתחברות נכשלה'))}
          >
            המשך בלי חשבון
          </Button>
          <p className="px-1 pt-1 text-xs leading-relaxed text-fg-subtle">
            חשבון אנונימי נמחק אוטומטית אחרי 30 יום בלי כניסה, וגם ניקוי נתוני הדפדפן מאבד את
            הגישה אליו. הקודים המודפסים ימשיכו לעבוד גם אז — אבל לא תוכלו לערוך אותם או לראות
            כמה סרקו. אפשר לשדרג לחשבון גוגל בכל שלב בלי לאבד קודים.
          </p>
        </div>

        <Divider />

        <Section title="חשוב לדעת">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
            <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
            קוד רגיל נוצר במלואו במכשיר שלכם ואינו נשלח לשום מקום. קוד דינמי, מעצם טבעו, נשמר
            בשרת — זו העסקה שמאפשרת לשנות אותו אחר כך ולמדוד סריקות.
          </p>
        </Section>
      </Sheet>
    );
  }

  /* ── מחובר ───────────────────────────────────────────────────── */
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="קודים דינמיים"
      subtitle={auth.user.isAnonymous ? 'מחובר ללא חשבון' : (auth.user.email ?? 'מחובר')}
      footer={
        <Button
          variant="ink"
          size="lg"
          block
          loading={busy}
          disabled={!target.trim()}
          onClick={() => void handleCreate()}
          icon={<Link2 size={18} />}
        >
          יצירת קוד דינמי
        </Button>
      }
    >
      <Section title="קוד חדש">
        <div className="space-y-2.5">
          <LabeledInput label="יעד" value={target} onChange={setTarget} dir="ltr" placeholder="example.co.il" />
          <LabeledInput label="שם לזיהוי" value={title} onChange={setTitle} placeholder="תפריט הקפה" />
        </div>
        <p className="text-xs leading-relaxed text-fg-muted">
          הקוד יצביע על כתובת קצרה שלכם, ואת היעד שמאחוריה אפשר להחליף בכל רגע — גם אחרי שהקוד
          הודפס.
        </p>
      </Section>

      <Divider />

      <Section title={`הקודים שלי${links.length ? ` (${links.length})` : ''}`}>
        {loading ? (
          <p className="flex items-center gap-2 py-3 text-[0.875rem] text-fg-muted">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            טוען…
          </p>
        ) : links.length === 0 ? (
          <p className="py-3 text-[0.875rem] text-fg-muted">עדיין אין קודים דינמיים.</p>
        ) : (
          <motion.ul variants={listParent} initial="hidden" animate="show" className="space-y-2">
            {links.map((link) => (
              <motion.li key={link.id} variants={listItem}>
                <LinkRow
                  link={link}
                  active={link.id === activeId}
                  showStats={statsFor === link.id}
                  onToggleStats={() => setStatsFor(statsFor === link.id ? null : link.id)}
                  onUse={() => {
                    onUse(link);
                    onClose();
                  }}
                  onChanged={(next) => {
                    setLinks((prev) => prev.map((l) => (l.id === next.id ? next : l)));
                    if (next.id === activeId) onUse(next);
                  }}
                  onDeleted={() => {
                    setLinks((prev) => prev.filter((l) => l.id !== link.id));
                    if (link.id === activeId) onUse(null);
                  }}
                  onError={onError}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Section>

      <Divider />

      <div className="flex items-center justify-between gap-3 py-3">
        <span className="text-xs text-fg-subtle">
          {auth.user.isAnonymous ? 'הקודים קשורים למכשיר הזה' : auth.user.email}
        </span>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="text-xs font-semibold text-fg-muted transition-colors hover:text-danger"
        >
          התנתקות
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

function LabeledInput({
  label,
  value,
  onChange,
  dir = 'auto',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: 'ltr' | 'rtl' | 'auto';
  placeholder?: string;
}): ReactNode {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[0.75rem] font-semibold text-fg-muted">{label}</span>
      <input
        type="text"
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border bg-surface px-3.5 text-right text-[0.875rem] font-medium outline-none transition-colors focus:border-fg"
      />
    </label>
  );
}

function LinkRow({
  link,
  active,
  showStats,
  onToggleStats,
  onUse,
  onChanged,
  onDeleted,
  onError,
}: {
  link: DynamicLink;
  active: boolean;
  showStats: boolean;
  onToggleStats: () => void;
  onUse: () => void;
  onChanged: (link: DynamicLink) => void;
  onDeleted: () => void;
  onError: (message: string) => void;
}): ReactNode {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(link.target);
  const [stats, setStats] = useState<ReturnType<typeof summarizeScans> | null>(null);

  useEffect(() => {
    if (!showStats || stats) return;
    void listScans(link.id)
      .then((scans) => setStats(summarizeScans(scans)))
      .catch(() => onError('טעינת הסטטיסטיקה נכשלה'));
  }, [showStats, stats, link.id, onError]);

  const save = async (): Promise<void> => {
    try {
      await updateLink(link.id, { target: draft });
      onChanged({ ...link, target: draft });
      setEditing(false);
    } catch {
      onError('העדכון נכשל');
    }
  };

  const toggleActive = async (): Promise<void> => {
    try {
      await updateLink(link.id, { active: !link.active });
      onChanged({ ...link, active: !link.active });
    } catch {
      onError('העדכון נכשל');
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-tile)] border transition-colors',
        active ? 'border-fg' : 'border-border',
      )}
    >
      <div className="flex items-center gap-2.5 p-3">
        <button type="button" onClick={onUse} className="min-w-0 flex-1 text-start">
          <span className="block truncate text-[0.875rem] font-semibold">
            {link.title || link.target}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[0.75rem] text-fg-subtle" dir="ltr">
            /r/{link.id}
          </span>
        </button>

        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-1 text-[0.6875rem] font-bold tabular-nums',
            link.scanCount > 0 ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-fg-subtle',
          )}
        >
          {link.scanCount} סריקות
        </span>
      </div>

      <div className="flex border-t border-border">
        <RowAction icon={<Pencil size={14} />} label="עריכה" onClick={() => setEditing((v) => !v)} />
        <RowAction icon={<BarChart3 size={14} />} label="נתונים" onClick={onToggleStats} />
        <RowAction
          icon={<Power size={14} />}
          label={link.active ? 'כיבוי' : 'הפעלה'}
          onClick={() => void toggleActive()}
          tone={link.active ? undefined : 'warn'}
        />
        <RowAction
          icon={<Trash2 size={14} />}
          label="מחיקה"
          tone="danger"
          onClick={() => {
            if (!confirm('למחוק את הקוד? קודים מודפסים שמצביעים עליו יפסיקו לעבוד.')) return;
            void deleteLink(link.id).then(onDeleted).catch(() => onError('המחיקה נכשלה'));
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSnappy}
            className="overflow-hidden border-t border-border"
          >
            <div className="space-y-2 p-3">
              <input
                type="text"
                dir="ltr"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-right text-[0.875rem] outline-none focus:border-fg"
              />
              <Button variant="ink" size="sm" block onClick={() => void save()}>
                שמירת היעד החדש
              </Button>
            </div>
          </motion.div>
        )}

        {showStats && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSnappy}
            className="overflow-hidden border-t border-border"
          >
            <div className="space-y-2 p-3">
              {!stats ? (
                <p className="text-xs text-fg-muted">טוען נתונים…</p>
              ) : stats.byDevice.length === 0 ? (
                <p className="text-xs text-fg-muted">עדיין אין סריקות.</p>
              ) : (
                <>
                  <StatRow label="לפי מכשיר" items={stats.byDevice.map((d) => `${d.label}: ${d.count}`)} />
                  <StatRow
                    label="לפי מדינה"
                    items={stats.countries.slice(0, 4).map((c) => `${c.code}: ${c.count}`)}
                  />
                  <p className="pt-1 text-[0.6875rem] leading-relaxed text-fg-subtle">
                    נשמרים מדינה, סוג מכשיר וזמן בלבד — בלי כתובות IP.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!link.active && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fade}
          className="flex items-center gap-1.5 border-t border-border bg-warning/10 px-3 py-2 text-[0.6875rem] font-medium text-warning"
        >
          <TriangleAlert size={12} aria-hidden />
          הקוד כבוי — מי שסורק מקבל דף הסבר
        </motion.p>
      )}
    </div>
  );
}

function RowAction({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'danger' | 'warn';
}): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[0.75rem] font-semibold transition-colors',
        'border-e border-border last:border-e-0 hover:bg-surface-2',
        tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warning' : 'text-fg-muted',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatRow({ label, items }: { label: string; items: string[] }): ReactNode {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="text-[0.75rem] font-semibold text-fg">{label}</span>
      <span className="text-[0.75rem] text-fg-muted">{items.join(' · ')}</span>
    </div>
  );
}

export { linkUrl };
