import { describe, expect, it } from "vitest";
import {
  editorReducer,
  initialEditor,
  type EditorState,
} from "../../src/components/MultilineEditor.js";

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
