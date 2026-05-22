import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import {
  editorReducer,
  initialEditor,
  type EditorState,
} from "../../src/components/MultilineEditor.state.js";
import { MultilineEditor } from "../../src/components/MultilineEditor.js";
import { stripAnsi } from "../helpers/ansi.js";

function flush(ms = 0) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

describe("editorReducer", () => {
  it("initialEditor places the cursor at the end of the text", () => {
    const s = initialEditor("hi");
    expect(s.text).toBe("hi");
    expect(s.cursor).toBe(2);
  });

  it("INSERT types a character at the cursor", () => {
    const s = editorReducer(initialEditor("hi"), { type: "INSERT", ch: "!" });
    expect(s.text).toBe("hi!");
    expect(s.cursor).toBe(3);
  });

  it("INSERT in the middle of the text inserts at the cursor", () => {
    const s0: EditorState = { text: "ac", cursor: 1 };
    const s = editorReducer(s0, { type: "INSERT", ch: "b" });
    expect(s.text).toBe("abc");
    expect(s.cursor).toBe(2);
  });

  it("NEWLINE inserts a line break at the cursor", () => {
    const s0: EditorState = { text: "hello", cursor: 5 };
    const s = editorReducer(s0, { type: "NEWLINE" });
    expect(s.text).toBe("hello\n");
    expect(s.cursor).toBe(6);
  });

  it("NEWLINE in the middle splits the line at the cursor", () => {
    const s0: EditorState = { text: "abcd", cursor: 2 };
    const s = editorReducer(s0, { type: "NEWLINE" });
    expect(s.text).toBe("ab\ncd");
    expect(s.cursor).toBe(3);
  });

  it("BACKSPACE deletes the character before the cursor", () => {
    const s0: EditorState = { text: "abc", cursor: 3 };
    const s = editorReducer(s0, { type: "BACKSPACE" });
    expect(s.text).toBe("ab");
    expect(s.cursor).toBe(2);
  });

  it("BACKSPACE at the start of a line joins with the previous line", () => {
    const s0: EditorState = { text: "a\nb", cursor: 2 };
    const s = editorReducer(s0, { type: "BACKSPACE" });
    expect(s.text).toBe("ab");
    expect(s.cursor).toBe(1);
  });

  it("BACKSPACE at start of text is a no-op", () => {
    const s0: EditorState = { text: "abc", cursor: 0 };
    const s = editorReducer(s0, { type: "BACKSPACE" });
    expect(s.text).toBe("abc");
    expect(s.cursor).toBe(0);
  });

  it("MOVE dx=-1 moves the cursor left", () => {
    const s0: EditorState = { text: "abc", cursor: 2 };
    const s = editorReducer(s0, { type: "MOVE", dx: -1, dy: 0 });
    expect(s.cursor).toBe(1);
  });

  it("MOVE dx=1 moves the cursor right", () => {
    const s0: EditorState = { text: "abc", cursor: 1 };
    const s = editorReducer(s0, { type: "MOVE", dx: 1, dy: 0 });
    expect(s.cursor).toBe(2);
  });

  it("MOVE dx=-1 at start is a no-op", () => {
    const s0: EditorState = { text: "abc", cursor: 0 };
    const s = editorReducer(s0, { type: "MOVE", dx: -1, dy: 0 });
    expect(s.cursor).toBe(0);
  });

  it("MOVE dx=1 at end is a no-op", () => {
    const s0: EditorState = { text: "abc", cursor: 3 };
    const s = editorReducer(s0, { type: "MOVE", dx: 1, dy: 0 });
    expect(s.cursor).toBe(3);
  });

  it("MOVE dy=-1 moves up keeping column when possible", () => {
    //  ab          <- line 0 (cols 0..2)
    //  cdef        <- line 1, cursor at "f" (cursor=6, col=3)
    const s0: EditorState = { text: "ab\ncdef", cursor: 6 };
    const s = editorReducer(s0, { type: "MOVE", dx: 0, dy: -1 });
    // Going up to line 0 (length 2), col is clamped to end-of-line.
    expect(s.cursor).toBe(2);
  });

  it("MOVE dy=-1 preserves column when the line is long enough", () => {
    const s0: EditorState = { text: "abcd\nefgh", cursor: 7 }; // col 2 on line 1
    const s = editorReducer(s0, { type: "MOVE", dx: 0, dy: -1 });
    // Up to line 0, col 2 → absolute index 2.
    expect(s.cursor).toBe(2);
  });

  it("MOVE dy=1 moves down keeping column when possible", () => {
    const s0: EditorState = { text: "abcd\nefgh", cursor: 2 }; // line 0, col 2
    const s = editorReducer(s0, { type: "MOVE", dx: 0, dy: 1 });
    // Down to line 1, col 2 → absolute index 7 (5 + 2).
    expect(s.cursor).toBe(7);
  });

  it("MOVE dy=1 on the last line is a no-op", () => {
    const s0: EditorState = { text: "ab", cursor: 1 };
    const s = editorReducer(s0, { type: "MOVE", dx: 0, dy: 1 });
    expect(s.cursor).toBe(1);
  });

  it("SET replaces the text and clamps the cursor", () => {
    const s0: EditorState = { text: "abcdef", cursor: 5 };
    const s = editorReducer(s0, { type: "SET", text: "xy" });
    expect(s.text).toBe("xy");
    expect(s.cursor).toBe(2);
  });
});

describe("MultilineEditor component", () => {
  it("renders the initial value across multiple lines", async () => {
    const { lastFrame, unmount } = render(
      <MultilineEditor initialValue={"hello\nworld"} isActive />,
    );
    await flush(10);
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("hello");
    expect(frame).toContain("world");
    unmount();
  });

  it("Enter inserts a newline (does not submit)", async () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const { stdin, lastFrame, unmount } = render(
      <MultilineEditor
        initialValue="ab"
        isActive
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );
    await flush(10);
    stdin.write("\r"); // Enter
    await flush(10);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith("ab\n");
    // After newline the frame should now span at least two text lines.
    const frame = stripAnsi(lastFrame());
    expect(frame).toContain("ab");
    unmount();
  });

  it("typed characters are inserted at the cursor", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <MultilineEditor initialValue="ab" isActive onChange={onChange} />,
    );
    await flush(10);
    stdin.write("c");
    await flush(10);
    expect(onChange).toHaveBeenLastCalledWith("abc");
    unmount();
  });

  it("Ctrl+R submits the current text", async () => {
    const onSubmit = vi.fn();
    const { stdin, unmount } = render(
      <MultilineEditor initialValue="run me" isActive onSubmit={onSubmit} />,
    );
    await flush(10);
    stdin.write("\x12"); // Ctrl+R
    await flush(10);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("run me");
    unmount();
  });

  it("Esc calls onCancel", async () => {
    const onCancel = vi.fn();
    const { stdin, unmount } = render(
      <MultilineEditor initialValue="x" isActive onCancel={onCancel} />,
    );
    await flush(10);
    stdin.write("\x1B"); // Esc
    // Ink debounces escape ~20ms before flushing as a lone Esc.
    await flush(50);
    expect(onCancel).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("Backspace deletes the previous character", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <MultilineEditor initialValue="abc" isActive onChange={onChange} />,
    );
    await flush(10);
    stdin.write("\x7F"); // Backspace
    await flush(10);
    expect(onChange).toHaveBeenLastCalledWith("ab");
    unmount();
  });
});
