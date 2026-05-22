import { useCallback, useEffect, useReducer, useRef } from "react";

export type AsyncState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  reload: () => void;
};

type InternalState<T> = {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  /** Bumped to re-run the effect (manual reload). */
  tick: number;
};

type InternalAction<T> =
  | { type: "PENDING" }
  | { type: "RESOLVED"; data: T }
  | { type: "REJECTED"; error: Error }
  | { type: "RELOAD" };

function reducer<T>(state: InternalState<T>, action: InternalAction<T>): InternalState<T> {
  switch (action.type) {
    case "PENDING":
      // One state transition instead of two setStates (was loading=true + error=undefined).
      return { ...state, loading: true, error: undefined };
    case "RESOLVED":
      return { ...state, data: action.data, loading: false, error: undefined };
    case "REJECTED":
      return { ...state, loading: false, error: action.error };
    case "RELOAD":
      return { ...state, tick: state.tick + 1 };
  }
}

/**
 * useReducer-backed async state. Compared to four useStates + a multi-call
 * effect this:
 *   - Collapses the "start loading" + "clear error" pair into a single
 *     PENDING action (one render, not two).
 *   - Coalesces the success path (data + clear-loading + clear-error) into
 *     a single RESOLVED action.
 *   - Same for REJECTED.
 *
 * The result is one render per phase transition, which avoids the
 * "cascading setState" anti-pattern react-doctor flags.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncState<T> {
  const [state, dispatch] = useReducer(reducer<T>, {
    data: undefined,
    loading: true,
    error: undefined,
    tick: 0,
  });
  // Keep the latest fn around without making the effect re-fire on every render.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    dispatch({ type: "PENDING" });
    fnRef
      .current(controller.signal)
      .then((value) => {
        if (cancelled) return;
        dispatch({ type: "RESOLVED", data: value });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        dispatch({
          type: "REJECTED",
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tick, ...deps]);

  const reload = useCallback(() => dispatch({ type: "RELOAD" }), []);
  return { data: state.data, loading: state.loading, error: state.error, reload };
}
