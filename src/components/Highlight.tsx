import { Text } from "ink";
import React from "react";

export type HighlightProps = {
  text: string;
  query: string;
  /** Inherited backgroundColor for the row (so the highlight blends in). */
  backgroundColor?: string;
};

/**
 * Render `text` with every case-insensitive occurrence of `query` wrapped in
 * a yellow+bold inner Text so search hits stand out in lists.
 *
 * Highlighting is done by splitting the string and emitting nested <Text>
 * nodes. Ink lets a nested Text inherit the parent's backgroundColor; we keep
 * that inheritance so the row's "selected" cyan bg stays continuous.
 */
export function Highlight({ text, query, backgroundColor }: HighlightProps) {
  if (!query) return <>{text}</>;

  const lc = text.toLowerCase();
  const q = query.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < text.length) {
    const idx = lc.indexOf(q, i);
    if (idx === -1) {
      nodes.push(<React.Fragment key={`p${k++}`}>{text.slice(i)}</React.Fragment>);
      break;
    }
    if (idx > i) {
      nodes.push(
        <React.Fragment key={`p${k++}`}>{text.slice(i, idx)}</React.Fragment>,
      );
    }
    nodes.push(
      <Text
        key={`h${k++}`}
        color="yellow"
        bold
        backgroundColor={backgroundColor}
      >
        {text.slice(idx, idx + q.length)}
      </Text>,
    );
    i = idx + q.length;
  }
  return <>{nodes}</>;
}
