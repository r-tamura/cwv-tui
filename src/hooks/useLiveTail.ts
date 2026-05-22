import { useEffect, useReducer } from "react";
import type { LogEvent } from "../types.js";

export type LiveTailStatus = "idle" | "streaming" | "ended" | "error";

export type UseLiveTailArgs = {
  subscribe: () => AsyncGenerator<LogEvent[], void, void>;
  max?: number;
};

type State = {
  events: LogEvent[];
  status: LiveTailStatus;
  error: Error | undefined;
};

type Action =
  | { type: "START" }
  | { type: "APPEND"; batch: LogEvent[]; max: number }
  | { type: "ENDED" }
  | { type: "ERROR"; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      // Set streaming and clear any prior error in one transition. Avoids
      // the "adjust state when a prop changes" pattern that the previous
      // useEffect+setStatus did at the top of the effect.
      return { ...state, status: "streaming", error: undefined };
    case "APPEND": {
      const merged = state.events.concat(action.batch);
      const trimmed =
        merged.length > action.max ? merged.slice(merged.length - action.max) : merged;
      return { ...state, events: trimmed };
    }
    case "ENDED":
      return { ...state, status: "ended" };
    case "ERROR":
      return { ...state, status: "error", error: action.error };
  }
}

export function useLiveTail({ subscribe, max = 500 }: UseLiveTailArgs) {
  const [state, dispatch] = useReducer(reducer, {
    events: [],
    status: "idle" as LiveTailStatus,
    error: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "START" });
    (async () => {
      try {
        for await (const batch of subscribe()) {
          if (cancelled) return;
          dispatch({ type: "APPEND", batch, max });
        }
        if (!cancelled) dispatch({ type: "ENDED" });
      } catch (e: unknown) {
        if (cancelled) return;
        dispatch({
          type: "ERROR",
          error: e instanceof Error ? e : new Error(String(e)),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscribe, max]);

  return { events: state.events, status: state.status, error: state.error };
}
