import {
  CalendarDays,
  Contact,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

/**
 * סוגי התוכן שאפשר לקודד.
 *
 * הכול מתואר כאן כדאטה — שדות, קידוד ותקציר — כדי שהטופס יהיה רנדרר גנרי
 * אחד ולא עשרה טפסים כתובים ביד. להוספת סוג חדש מספיק להוסיף רשומה.
 */

export type ContentKind =
  | 'link'
  | 'text'
  | 'wifi'
  | 'whatsapp'
  | 'vcard'
  | 'phone'
  | 'email'
  | 'sms'
  | 'geo'
  | 'event';

export type FieldType = 'text' | 'tel' | 'email' | 'url' | 'textarea' | 'datetime-local' | 'select';

export interface FieldSpec {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  /** שדה שבלעדיו אין מה לקודד */
  required?: boolean;
  dir?: 'ltr' | 'rtl' | 'auto';
  /** תופס חצי שורה במקום שורה מלאה */
  half?: boolean;
  hint?: string;
}

export type FieldValues = Record<string, string>;

export interface ContentType {
  kind: ContentKind;
  label: string;
  icon: LucideIcon;
  fields: FieldSpec[];
  /** ממיר את הערכים למחרוזת שנכנסת לקוד. מחרוזת ריקה = אין עדיין מה לקודד. */
  encode: (values: FieldValues) => string;
  /** תיאור קצר להצגה בממשק */
  summary: (values: FieldValues) => string;
}

/* ------------------------------------------------------------------ */
/* עזרי קידוד                                                          */
/* ------------------------------------------------------------------ */

/** בתקן ה-WIFI וב-vCard התווים האלה משמשים כמפרידים, ולכן חייבים בריחה. */
function escapeMecard(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

function escapeVcard(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([;,])/g, '\\$1');
}

/**
 * מנרמל מספר טלפון ישראלי לפורמט בינלאומי.
 *
 * `05X-XXXXXXX` הופך ל-`9725XXXXXXX`. מספר שכבר בפורמט בינלאומי נשאר כמו שהוא.
 */
export function normalizePhone(raw: string, defaultCountry = '972'): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return defaultCountry + digits.slice(1);
  return digits;
}

/** ממיר `datetime-local` לפורמט iCalendar (UTC). */
function toICalDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

const trim = (values: FieldValues, name: string): string => (values[name] ?? '').trim();

/* ------------------------------------------------------------------ */
/* הגדרות הסוגים                                                       */
/* ------------------------------------------------------------------ */

const URLISH = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const LOOKS_LIKE_DOMAIN = /^[\w֐-׿-]+(\.[\w֐-׿-]+)+(\/\S*)?$/i;

export const CONTENT_TYPES: Record<ContentKind, ContentType> = {
  link: {
    kind: 'link',
    label: 'קישור',
    icon: Link2,
    fields: [{ name: 'url', label: 'כתובת', type: 'url', placeholder: 'example.co.il', required: true, dir: 'ltr' }],
    encode: (v) => {
      const url = trim(v, 'url');
      if (!url) return '';
      if (URLISH.test(url)) return url;
      return LOOKS_LIKE_DOMAIN.test(url) ? `https://${url}` : url;
    },
    summary: (v) => trim(v, 'url'),
  },

  text: {
    kind: 'text',
    label: 'טקסט',
    icon: Type,
    fields: [
      { name: 'text', label: 'הטקסט', type: 'textarea', placeholder: 'כל טקסט חופשי', required: true, dir: 'auto' },
    ],
    encode: (v) => trim(v, 'text'),
    summary: (v) => trim(v, 'text'),
  },

  wifi: {
    kind: 'wifi',
    label: 'WiFi',
    icon: Wifi,
    fields: [
      { name: 'ssid', label: 'שם הרשת', placeholder: 'MyNetwork', required: true, dir: 'ltr' },
      { name: 'password', label: 'סיסמה', placeholder: '••••••••', dir: 'ltr' },
      {
        name: 'security',
        label: 'הצפנה',
        type: 'select',
        half: true,
        options: [
          { value: 'WPA', label: 'WPA / WPA2' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'ללא סיסמה' },
        ],
      },
      {
        name: 'hidden',
        label: 'רשת מוסתרת',
        type: 'select',
        options: [
          { value: '', label: 'לא' },
          { value: 'true', label: 'כן' },
        ],
        half: true,
      },
    ],
    encode: (v) => {
      const ssid = trim(v, 'ssid');
      if (!ssid) return '';
      const security = trim(v, 'security') || 'WPA';
      const password = security === 'nopass' ? '' : trim(v, 'password');
      const hidden = trim(v, 'hidden') === 'true' ? 'H:true;' : '';
      return `WIFI:T:${security};S:${escapeMecard(ssid)};${password ? `P:${escapeMecard(password)};` : ''}${hidden};`;
    },
    summary: (v) => trim(v, 'ssid'),
  },

  whatsapp: {
    kind: 'whatsapp',
    label: 'וואטסאפ',
    icon: MessageCircle,
    fields: [
      {
        name: 'phone',
        label: 'מספר טלפון',
        type: 'tel',
        placeholder: '050-1234567',
        required: true,
        dir: 'ltr',
        hint: 'מספר ישראלי שמתחיל ב‑0 יומר אוטומטית לפורמט בינלאומי',
      },
      { name: 'message', label: 'הודעה מוכנה מראש', type: 'textarea', placeholder: 'היי, אשמח לפרטים', dir: 'auto' },
    ],
    encode: (v) => {
      const phone = normalizePhone(trim(v, 'phone'));
      if (!phone) return '';
      const message = trim(v, 'message');
      return `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    },
    summary: (v) => trim(v, 'phone'),
  },

  vcard: {
    kind: 'vcard',
    label: 'איש קשר',
    icon: Contact,
    fields: [
      { name: 'firstName', label: 'שם פרטי', required: true, half: true, dir: 'auto' },
      { name: 'lastName', label: 'שם משפחה', half: true, dir: 'auto' },
      { name: 'phone', label: 'טלפון', type: 'tel', placeholder: '050-1234567', dir: 'ltr' },
      { name: 'email', label: 'אימייל', type: 'email', placeholder: 'name@example.com', dir: 'ltr' },
      { name: 'org', label: 'ארגון', half: true, dir: 'auto' },
      { name: 'title', label: 'תפקיד', half: true, dir: 'auto' },
      { name: 'url', label: 'אתר', type: 'url', placeholder: 'example.co.il', dir: 'ltr' },
    ],
    encode: (v) => {
      const first = trim(v, 'firstName');
      const last = trim(v, 'lastName');
      if (!first && !last) return '';
      const full = [first, last].filter(Boolean).join(' ');
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
        `FN:${escapeVcard(full)}`,
      ];
      const phone = trim(v, 'phone');
      const email = trim(v, 'email');
      const org = trim(v, 'org');
      const title = trim(v, 'title');
      const url = trim(v, 'url');
      if (phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(phone)}`);
      if (email) lines.push(`EMAIL:${escapeVcard(email)}`);
      if (org) lines.push(`ORG:${escapeVcard(org)}`);
      if (title) lines.push(`TITLE:${escapeVcard(title)}`);
      if (url) lines.push(`URL:${escapeVcard(URLISH.test(url) ? url : `https://${url}`)}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    },
    summary: (v) => [trim(v, 'firstName'), trim(v, 'lastName')].filter(Boolean).join(' '),
  },

  phone: {
    kind: 'phone',
    label: 'טלפון',
    icon: Phone,
    fields: [
      { name: 'phone', label: 'מספר טלפון', type: 'tel', placeholder: '050-1234567', required: true, dir: 'ltr' },
    ],
    encode: (v) => {
      const phone = trim(v, 'phone');
      return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
    },
    summary: (v) => trim(v, 'phone'),
  },

  email: {
    kind: 'email',
    label: 'אימייל',
    icon: Mail,
    fields: [
      { name: 'to', label: 'נמען', type: 'email', placeholder: 'name@example.com', required: true, dir: 'ltr' },
      { name: 'subject', label: 'נושא', dir: 'auto' },
      { name: 'body', label: 'תוכן ההודעה', type: 'textarea', dir: 'auto' },
    ],
    encode: (v) => {
      const to = trim(v, 'to');
      if (!to) return '';
      const params = new URLSearchParams();
      const subject = trim(v, 'subject');
      const body = trim(v, 'body');
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const query = params.toString();
      return `mailto:${to}${query ? `?${query}` : ''}`;
    },
    summary: (v) => trim(v, 'to'),
  },

  sms: {
    kind: 'sms',
    label: 'SMS',
    icon: MessageSquare,
    fields: [
      { name: 'phone', label: 'מספר טלפון', type: 'tel', placeholder: '050-1234567', required: true, dir: 'ltr' },
      { name: 'message', label: 'תוכן ההודעה', type: 'textarea', dir: 'auto' },
    ],
    encode: (v) => {
      const phone = trim(v, 'phone').replace(/[^\d+]/g, '');
      if (!phone) return '';
      // SMSTO הוא הפורמט שסורקי QR מזהים בעקביות, בניגוד ל-sms: שמתנהג שונה בין מערכות
      return `SMSTO:${phone}:${trim(v, 'message')}`;
    },
    summary: (v) => trim(v, 'phone'),
  },

  geo: {
    kind: 'geo',
    label: 'מיקום',
    icon: MapPin,
    fields: [
      { name: 'lat', label: 'קו רוחב', placeholder: '32.0853', required: true, half: true, dir: 'ltr' },
      { name: 'lon', label: 'קו אורך', placeholder: '34.7818', required: true, half: true, dir: 'ltr' },
    ],
    encode: (v) => {
      const rawLat = trim(v, 'lat');
      const rawLon = trim(v, 'lon');
      // `Number('')` הוא 0, ולכן שדות ריקים היו מייצרים geo:0,0 — קוד תקין
      // לחלוטין שמצביע על נקודה באוקיינוס. בודקים קודם שיש בכלל ערך.
      if (!rawLat || !rawLon) return '';
      const lat = Number(rawLat);
      const lon = Number(rawLon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '';
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return '';
      return `geo:${lat},${lon}`;
    },
    summary: (v) => `${trim(v, 'lat')}, ${trim(v, 'lon')}`,
  },

  event: {
    kind: 'event',
    label: 'אירוע',
    icon: CalendarDays,
    fields: [
      { name: 'title', label: 'שם האירוע', required: true, dir: 'auto' },
      { name: 'location', label: 'מיקום', dir: 'auto' },
      { name: 'start', label: 'התחלה', type: 'datetime-local', half: true },
      { name: 'end', label: 'סיום', type: 'datetime-local', half: true },
    ],
    encode: (v) => {
      const title = trim(v, 'title');
      if (!title) return '';
      const lines = ['BEGIN:VEVENT', `SUMMARY:${escapeVcard(title)}`];
      const location = trim(v, 'location');
      const start = toICalDate(trim(v, 'start'));
      const end = toICalDate(trim(v, 'end'));
      if (location) lines.push(`LOCATION:${escapeVcard(location)}`);
      if (start) lines.push(`DTSTART:${start}`);
      if (end) lines.push(`DTEND:${end}`);
      lines.push('END:VEVENT');
      return lines.join('\n');
    },
    summary: (v) => trim(v, 'title'),
  },
};

export const CONTENT_ORDER: ContentKind[] = [
  'link',
  'text',
  'wifi',
  'whatsapp',
  'vcard',
  'phone',
  'email',
  'sms',
  'geo',
  'event',
];

/** הודעה מנחה (לא שגיאה) על נרמול שבוצע אוטומטית. */
export function contentNote(kind: ContentKind, values: FieldValues): string | null {
  if (kind === 'link') {
    const url = trim(values, 'url');
    if (url && !URLISH.test(url) && LOOKS_LIKE_DOMAIN.test(url)) {
      return 'הוספנו https:// בתחילת הכתובת';
    }
  }
  if (kind === 'whatsapp' || kind === 'vcard' || kind === 'phone' || kind === 'sms') {
    const raw = trim(values, 'phone');
    if (kind === 'whatsapp' && raw.startsWith('0')) {
      return `המספר יישלח כ‑${normalizePhone(raw)}`;
    }
  }
  return null;
}
