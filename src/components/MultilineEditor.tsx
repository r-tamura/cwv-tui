import { Box, Text, useInput } from "ink";
import React, { useReducer } from "react";
import { useTextInputLock } from "../state/inputContext.js";
import {
  type EditorAction,
  type EditorState,
  editorReducer,
  initialEditor,
} from "./MultilineEditor.state.js";

export type MultilineEditorProps = {
  initialValue: string;
  onChange?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onCancel?: () => void;
  /** Disable input handling (e.g., when not focused). Defaults to true. */
  isActive?: boolean;
};

export function MultilineEditor({
  initialValue,
  onChange,
  onSubmit,
  onCancel,
  isActive = true,
}: MultilineEditorProps): React.ReactElement {
  const [state, dispatch] = useReducer(editorReducer, initialValue, initialEditor);

  useTextInputLock(isActive);

  // Notify the parent synchronously from the input handler so we don't
  // bounce data through a useEffect (avoids the
  // "no-pass-data-to-parent" anti-pattern). We re-run the reducer once
  // ourselves to peek at the next state; reducer is pure and cheap.
  const apply = (action: EditorAction) => {
    const next = editorReducer(state, action);
    dispatch(action);
    if (onChange && next.text !== state.text) {
      onChange(next.text);
    }
  };

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
        apply({ type: "NEWLINE" });
        return;
      }
      if (key.backspace || key.delete) {
        apply({ type: "BACKSPACE" });
        return;
      }
      if (key.leftArrow) {
        apply({ type: "MOVE", dx: -1, dy: 0 });
        return;
      }
      if (key.rightArrow) {
        apply({ type: "MOVE", dx: 1, dy: 0 });
        return;
      }
      if (key.upArrow) {
        apply({ type: "MOVE", dx: 0, dy: -1 });
        return;
      }
      if (key.downArrow) {
        apply({ type: "MOVE", dx: 0, dy: 1 });
        return;
      }
      // Ignore other control-key combos so they don't end up in the buffer.
      if (key.ctrl || key.meta) return;
      if (!input) return;
      // Printable input (may contain multiple characters in a single event).
      apply({ type: "INSERT", ch: input });
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      <EditorRows state={state} />
    </Box>
  );
}

/**
 * Renders the editor's text into JSX rows, with a block-style cursor at the
 * current offset. When the cursor sits at end-of-text we render an inverse
 * space so it stays visible. Extracted as a real component (instead of an
 * inline render function) so React's reconciler can track row identity
 * across renders.
 */
function EditorRows({ state }: { state: EditorState }) {
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
  return (
    <>
      {lines.map((lineText, i) => {
        if (i !== line) {
          // No cursor on this line. Render a single space if empty so Ink
          // keeps the row visible.
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
            {at.length > 0 ? <Text inverse>{at}</Text> : <Text inverse>{" "}</Text>}
            {after}
          </Text>
        );
      })}
    </>
  );
}
