import { useEffect, useState } from 'react';

/** מחזיר את הערך רק אחרי שקט של `delay` — מונע חישוב QR מחדש בכל הקשה. */
export function useDebounced<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
