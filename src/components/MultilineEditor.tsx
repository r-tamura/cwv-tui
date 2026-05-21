import { Box, Text } from "ink";
import React from "react";

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

// Placeholder export so the file is valid before C2 wires up the JSX.
// The renderer will be added in Task C2.
export function MultilineEditor(_props: MultilineEditorProps): React.ReactElement {
  return (
    <Box>
      <Text> </Text>
    </Box>
  );
}
