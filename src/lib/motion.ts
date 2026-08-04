import type { Transition, Variants } from 'framer-motion';

/**
 * מערכת התנועה.
 *
 * כל ההנפשות באפליקציה נשענות על הקבועים כאן, כדי שהתחושה תהיה אחידה:
 * קפיצים לתנועה במרחב (גיליונות, בחירה), ועקומת easing לדעיכות אטימות.
 * טווח 150–350ms — מהיר מספיק כדי להרגיש מיידי, איטי מספיק כדי להיקרא.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** קפיץ רך לגיליונות ולתנועות גדולות. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.9,
};

/** קפיץ הדוק לאלמנטים קטנים — סמן בחירה, תגיות. */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 620,
  damping: 42,
  mass: 0.6,
};

export const fade: Transition = { duration: 0.2, ease: EASE_OUT };

/** כניסה מדורגת של רשימה — האב מתזמן, הילדים נכנסים. */
export const listParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
};

/** כניסה עדינה מלמטה — לבלוקים בעמוד הראשי. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

/** לחיצה על כפתור — משוב מיידי בלי לקפוץ. */
export const pressable = {
  whileTap: { scale: 0.97 },
  transition: springSnappy,
} as const;
