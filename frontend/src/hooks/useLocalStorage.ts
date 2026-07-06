import { useCallback, useState } from 'react';
import { storage } from '../services/storage.service';

/**
 * useLocalStorage — React state đồng bộ với localStorage (qua storage.service).
 * #hooks-consolidation
 *
 * `[value, set, remove]`. Đọc lần đầu từ storage (JSON-safe), fallback `initial`.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => storage.get<T>(key) ?? initial);

  const set = useCallback(
    (v: T) => {
      setValue(v);
      storage.set(key, v);
    },
    [key],
  );

  const remove = useCallback(() => {
    setValue(initial);
    storage.remove(key);
  }, [key, initial]);

  return [value, set, remove] as const;
}
