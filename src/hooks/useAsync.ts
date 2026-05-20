import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
};

export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    fnRef
      .current(controller.signal)
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, loading, error, reload };
}
