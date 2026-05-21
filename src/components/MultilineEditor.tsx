import { Box, Text, useInput } from "ink";
import React, { useEffect, useReducer, useRef } from "react";
import { useTextInputLock } from "../state/inputContext.js";

/**
 * Pure state model for the multiline editor. The text is a single string
 * that may contain "\n"; the cursor is a character offset into that string,
 * with `cursor === text.length` meaning "after the last character".
 */
export type EditorState = {
  text: string;
  cursor: number;
};

export type EditorAction =
  | { type: "INSERT"; ch: string }
  | { type: "NEWLINE" }
  | { type: "BACKSPACE" }
  | { type: "MOVE"; dx: -1 | 0 | 1; dy: -1 | 0 | 1 }
  | { type: "SET"; text: string };

export function initialEditor(text: string): EditorState {
  return { text, cursor: text.length };
}

/**
 * Compute the (line, column) coordinates of a character offset.
 * line is 0-based; column is the offset from the start of that line.
 */
function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, col: offset - lineStart };
}

/** Inverse of offsetToLineCol. Clamps line/col into range. */
function lineColToOffset(text: string, line: number, col: number): number {
  const lines = text.split("\n");
  if (line < 0) return 0;
  if (line >= lines.length) {
    // Past last line: end of text.
    return text.length;
  }
  // Sum lengths of preceding lines (+1 for each newline).
  let offset = 0;
  for (let i = 0; i < line; i++) offset += lines[i]!.length + 1;
  const lineLen = lines[line]!.length;
  return offset + Math.min(Math.max(col, 0), lineLen);
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "INSERT": {
      const before = state.text.slice(0, state.cursor);
      const after = state.text.slice(state.cursor);
      return {
        text: before + action.ch + after,
        cursor: state.cursor + action.ch.length,
      };
    }
    case "NEWLINE": {
      const before = state.text.slice(0, state.cursor);
      const after = state.text.slice(state.cursor);
      return { text: before + "\n" + after, cursor: state.cursor + 1 };
    }
    case "BACKSPACE": {
      if (state.cursor === 0) return state;
      const before = state.text.slice(0, state.cursor - 1);
      const after = state.text.slice(state.cursor);
      return { text: before + after, cursor: state.cursor - 1 };
    }
    case "MOVE": {
      if (action.dx !== 0) {
        const next = state.cursor + action.dx;
        const clamped = Math.min(Math.max(next, 0), state.text.length);
        return { ...state, cursor: clamped };
      }
      if (action.dy !== 0) {
        const { line, col } = offsetToLineCol(state.text, state.cursor);
        const targetLine = line + action.dy;
        if (targetLine < 0) return { ...state, cursor: 0 };
        const lines = state.text.split("\n");
        if (targetLine >= lines.length) return state;
        return { ...state, cursor: lineColToOffset(state.text, targetLine, col) };
      }
      return state;
    }
    case "SET": {
      const cursor = Math.min(state.cursor, action.text.length);
      return { text: action.text, cursor };
    }
  }
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

export type MultilineEditorProps = {
  initialValue: string;
  onChange?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  /** Disable input handling (e.g., when not focused). Defaults to true. */
  isActive?: boolean;
};

/**
 * Render the editor's text into JSX rows, with a block-style cursor at the
 * current offset. When the cursor sits at end-of-text we append a "█" so it
 * is still visible.
 */
function renderRows(state: EditorState): React.ReactNode {
  const { text, cursor } = state;
  const lines = text.split("\n");
  // Figure out which (line, col) the cursor lives on.
  let line = 0;
  let col = cursor;
  for (const l of lines) {
    if (col <= l.length) break;
    col -= l.length + 1; // account for the consumed "\n"
    line += 1;
  }
  return lines.map((lineText, i) => {
    if (i !== line) {
      // No cursor on this line. Render a single space if empty so Ink keeps
      // the row visible.
      return (
        <Text key={i}>{lineText.length === 0 ? " " : lineText}</Text>
      );
    }
    const before = lineText.slice(0, col);
    const at = lineText.slice(col, col + 1);
    const after = lineText.slice(col + 1);
    return (
      <Text key={i}>
        {before}
        {at.length > 0 ? (
          <Text inverse>{at}</Text>
        ) : (
          <Text inverse>{" "}</Text>
        )}
        {after}
      </Text>
    );
  });
}

export function MultilineEditor({
  initialValue,
  onChange,
  onSubmit,
  onCancel,
  isActive = true,
}: MultilineEditorProps): React.ReactElement {
  const [state, dispatch] = useReducer(editorReducer, initialValue, initialEditor);

  useTextInputLock(isActive);

  // Notify the parent on text changes (but not on the first render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onChange?.(state.text);
  }, [state.text, onChange]);

  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel?.();
        return;
      }
      if (key.ctrl && input === "r") {
        onSubmit?.(state.text);
        return;
      }
      if (key.return) {
        dispatch({ type: "NEWLINE" });
        return;
      }
      if (key.backspace || key.delete) {
        dispatch({ type: "BACKSPACE" });
        return;
      }
      if (key.leftArrow) {
        dispatch({ type: "MOVE", dx: -1, dy: 0 });
        return;
      }
      if (key.rightArrow) {
        dispatch({ type: "MOVE", dx: 1, dy: 0 });
        return;
      }
      if (key.upArrow) {
        dispatch({ type: "MOVE", dx: 0, dy: -1 });
        return;
      }
      if (key.downArrow) {
        dispatch({ type: "MOVE", dx: 0, dy: 1 });
        return;
      }
      // Ignore other control-key combos so they don't end up in the buffer.
      if (key.ctrl || key.meta) return;
      if (!input) return;
      // Printable input (may contain multiple characters in a single event).
      dispatch({ type: "INSERT", ch: input });
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">{renderRows(state)}</Box>
  );
}
