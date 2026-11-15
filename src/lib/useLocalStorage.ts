import { useEffect, useState } from 'react';

/**
 * localStorage에 자동 저장되는 state.
 * 나중에 서버/DB로 바꾸고 싶으면 store/AppStore.tsx만 수정하면 됩니다.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 저장 실패(사생활 모드 등) 시 무시 */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
