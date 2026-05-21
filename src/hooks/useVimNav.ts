import { useEffect, useRef } from "react";
import { useInput, type Key } from "ink";

export type VimNavOptions = {
  /** Total item count (cursor is clamped to [0, length-1]). */
  length: number;
  /** Visible window height; used for Ctrl+D / Ctrl+U / Ctrl+F / Ctrl+B steps. */
  pageSize: number;
  /** Current cursor position. */
  cursor: number;
  /** Called with the next cursor position. */
  setCursor: (next: number) => void;
  /** Disable when a text input is capturing keys. */
  isActive: boolean;
  /**
   * Maximum gap (ms) between two `g` presses to be treated as `gg`. The
   * standard Vim feel is "fast double-press"; one second is a generous cap.
   */
  ggTimeoutMs?: number;
};

/**
 * Hook that wires Vim-style navigation onto a cursor-driven list:
 *   j / ↓ / k / ↑       line down / up
 *   G                   go to bottom
 *   gg                  go to top (two `g` presses within ggTimeoutMs)
 *   Ctrl+D / Ctrl+U     half-page down / up
 *   Ctrl+F / Ctrl+B     full-page down / up
 *
 * Returns the key handler it registered (mostly for tests).
 */
export function useVimNav({
  length,
  pageSize,
  cursor,
  setCursor,
  isActive,
  ggTimeoutMs = 1000,
}: VimNavOptions): void {
  const lastG = useRef<number>(0);
  // Mirror of `cursor` that is updated synchronously inside the handler so
  // multiple key events within a single React commit cycle (e.g. an
  // auto-repeating held-down `j`) compose correctly instead of all reading
  // the same stale value.
  const cursorRef = useRef(cursor);
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const max = Math.max(0, length - 1);
  const half = Math.max(1, Math.floor(pageSize / 2));
  const full = Math.max(1, pageSize);

  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  const move = (next: number) => {
    const clamped = clamp(next);
    cursorRef.current = clamped;
    setCursor(clamped);
  };

  useInput(
    (input, key: Key) => {
      if (key.ctrl) {
        switch (input) {
          case "d":
            move(cursorRef.current + half);
            return;
          case "u":
            move(cursorRef.current - half);
            return;
          case "f":
            move(cursorRef.current + full);
            return;
          case "b":
            move(cursorRef.current - full);
            return;
        }
      }
      if (key.downArrow || input === "j") {
        move(cursorRef.current + 1);
        lastG.current = 0;
      } else if (key.upArrow || input === "k") {
        move(cursorRef.current - 1);
        lastG.current = 0;
      } else if (input === "G") {
        move(max);
        lastG.current = 0;
      } else if (input === "g") {
        const now = Date.now();
        if (now - lastG.current <= ggTimeoutMs) {
          move(0);
          lastG.current = 0;
        } else {
          lastG.current = now;
        }
      } else {
        // Any other key cancels a pending `g`.
        lastG.current = 0;
      }
    },
    { isActive },
  );
}
