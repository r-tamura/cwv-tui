import { useEffect, useState } from "react";
import type { LogEvent } from "../types.js";

export type LiveTailStatus = "idle" | "streaming" | "ended" | "error";

export type UseLiveTailArgs = {
  subscribe: () => AsyncGenerator<LogEvent[], void, void>;
  max?: number;
};

export function useLiveTail({ subscribe, max = 500 }: UseLiveTailArgs) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [status, setStatus] = useState<LiveTailStatus>("idle");
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;
    setStatus("streaming");
    (async () => {
      try {
        for await (const batch of subscribe()) {
          if (cancelled) return;
          setEvents((prev) => {
            const next = prev.concat(batch);
            return next.length > max ? next.slice(next.length - max) : next;
          });
        }
        if (!cancelled) setStatus("ended");
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscribe, max]);

  return { events, status, error };
}
