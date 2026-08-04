import { getDb, isBackendUnavailable, markBackendDisabled, markBackendReady } from './backend';

/**
 * קודים דינמיים.
 *
 * הקוד המודפס מצביע על `<origin>/r/<id>`, ופונקציית שרת מפנה ליעד הנוכחי.
 * המשמעות: אפשר להחליף את היעד אחרי שהקוד כבר הודפס על שלט או על תפריט,
 * ואפשר לדעת כמה סרקו.
 *
 * זה גם המקום היחיד באפליקציה שבו מידע עוזב את המכשיר — ולכן הוא מופרד
 * לגמרי ממסלול הקוד הרגיל, ומופעל רק בבחירה מפורשת.
 */

export interface DynamicLink {
  id: string;
  target: string;
  title: string;
  ownerId: string;
  active: boolean;
  scanCount: number;
  createdAt: number;
  lastScanAt: number | null;
  /** יעדים לפי מכשיר — למשל חנות אפליקציות שונה לכל מערכת */
  iosTarget?: string;
  androidTarget?: string;
}

export interface ScanEvent {
  at: number;
  country: string;
  device: string;
  platform: string;
}

/**
 * אלפבית בן 32 תווים ללא `0/O` ו-`1/I/l`.
 *
 * הבלבול בין התווים האלה חשוב כאן במיוחד: מזהה קוד מודפס מוקלד ידנית כשמישהו
 * לא מצליח לסרוק. חמישה תווים נותנים 33 מיליון צירופים — די בהרבה, וקצר מספיק
 * כדי לשמור על הקוד דליל.
 */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const ID_LENGTH = 5;

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** הכתובת שנכנסת לקוד עצמו. */
export function linkUrl(id: string): string {
  return `${window.location.origin}/r/${id}`;
}

function normalizeTarget(raw: string): string {
  const value = raw.trim();
  if (!value) throw new Error('צריך יעד לקוד');
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * יוצר קוד דינמי חדש.
 *
 * המזהה נבדק מול התנגשות בתוך טרנזקציה — שני משתמשים שיוצרים קוד באותו רגע
 * עלולים להגריל את אותו מזהה, וכתיבה עיוורת הייתה גונבת קוד קיים.
 */
export async function createLink(params: {
  target: string;
  title: string;
  ownerId: string;
}): Promise<DynamicLink> {
  const db = await getDb();
  const { doc, getDoc, runTransaction, serverTimestamp, collection } = await import(
    'firebase/firestore'
  );

  const target = normalizeTarget(params.target);

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = generateId();
      const ref = doc(collection(db, 'links'), id);

      const created = await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) return null;

        tx.set(ref, {
          target,
          title: params.title.slice(0, 120),
          ownerId: params.ownerId,
          active: true,
          scanCount: 0,
          createdAt: serverTimestamp(),
          lastScanAt: null,
        });
        return true;
      });

      if (created) {
        markBackendReady();
        // הקריאה החוזרת מביאה את חותמת הזמן שהשרת קבע
        const snapshot = await getDoc(ref);
        const data = snapshot.data();
        return {
          id,
          target,
          title: params.title,
          ownerId: params.ownerId,
          active: true,
          scanCount: 0,
          createdAt: data?.createdAt?.toMillis?.() ?? Date.now(),
          lastScanAt: null,
        };
      }
    }
    throw new Error('לא הצלחנו להקצות מזהה פנוי. נסו שוב.');
  } catch (error) {
    if (isBackendUnavailable(error)) markBackendDisabled();
    throw error;
  }
}

/** רשימת הקודים של המשתמש, החדשים קודם. */
export async function listLinks(ownerId: string): Promise<DynamicLink[]> {
  const db = await getDb();
  const { collection, getDocs, limit, orderBy, query, where } = await import('firebase/firestore');

  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'links'),
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
        limit(100),
      ),
    );
    markBackendReady();

    return snapshot.docs.map((entry) => {
      const data = entry.data();
      return {
        id: entry.id,
        target: data.target ?? '',
        title: data.title ?? '',
        ownerId: data.ownerId,
        active: data.active !== false,
        scanCount: data.scanCount ?? 0,
        createdAt: data.createdAt?.toMillis?.() ?? 0,
        lastScanAt: data.lastScanAt?.toMillis?.() ?? null,
        iosTarget: data.iosTarget,
        androidTarget: data.androidTarget,
      };
    });
  } catch (error) {
    if (isBackendUnavailable(error)) markBackendDisabled();
    throw error;
  }
}

export async function updateLink(
  id: string,
  changes: { target?: string; title?: string; active?: boolean },
): Promise<void> {
  const db = await getDb();
  const { doc, updateDoc } = await import('firebase/firestore');

  const payload: Record<string, unknown> = {};
  if (changes.target !== undefined) payload.target = normalizeTarget(changes.target);
  if (changes.title !== undefined) payload.title = changes.title.slice(0, 120);
  if (changes.active !== undefined) payload.active = changes.active;

  await updateDoc(doc(db, 'links', id), payload);
}

export async function deleteLink(id: string): Promise<void> {
  const db = await getDb();
  const { deleteDoc, doc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'links', id));
}

/** אירועי הסריקה האחרונים של קוד מסוים. */
export async function listScans(linkId: string, max = 200): Promise<ScanEvent[]> {
  const db = await getDb();
  const { collection, getDocs, limit, orderBy, query } = await import('firebase/firestore');

  const snapshot = await getDocs(
    query(collection(db, 'links', linkId, 'scans'), orderBy('at', 'desc'), limit(max)),
  );

  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      at: data.at?.toMillis?.() ?? 0,
      country: data.country ?? 'ZZ',
      device: data.device ?? 'unknown',
      platform: data.platform ?? 'other',
    };
  });
}

/** סיכום סריקות לתצוגה — ספירה לפי מכשיר ולפי יום. */
export function summarizeScans(scans: ScanEvent[]): {
  byDevice: Array<{ label: string; count: number }>;
  byDay: Array<{ day: string; count: number }>;
  countries: Array<{ code: string; count: number }>;
} {
  const devices = new Map<string, number>();
  const days = new Map<string, number>();
  const countries = new Map<string, number>();

  const labels: Record<string, string> = {
    mobile: 'טלפון',
    tablet: 'טאבלט',
    desktop: 'מחשב',
    unknown: 'לא ידוע',
  };

  for (const scan of scans) {
    devices.set(scan.device, (devices.get(scan.device) ?? 0) + 1);
    countries.set(scan.country, (countries.get(scan.country) ?? 0) + 1);
    if (scan.at) {
      const day = new Date(scan.at).toISOString().slice(0, 10);
      days.set(day, (days.get(day) ?? 0) + 1);
    }
  }

  return {
    byDevice: [...devices.entries()]
      .map(([key, count]) => ({ label: labels[key] ?? key, count }))
      .sort((a, b) => b.count - a.count),
    byDay: [...days.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    countries: [...countries.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
  };
}
