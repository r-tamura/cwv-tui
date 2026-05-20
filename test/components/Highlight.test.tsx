import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import { Text } from "ink";
import React from "react";
import { Highlight } from "../../src/components/Highlight.js";

function frameOf(node: React.ReactElement): string {
  const { lastFrame, unmount } = render(<Text>{node}</Text>);
  const frame = (lastFrame() ?? "").trimEnd();
  unmount();
  return frame;
}

describe("Highlight", () => {
  it("renders text verbatim when query is empty", () => {
    expect(frameOf(<Highlight text="hello world" query="" />)).toBe(
      "hello world",
    );
  });

  it("preserves all characters when highlighting", () => {
    expect(frameOf(<Highlight text="bar-worker" query="bar" />)).toBe(
      "bar-worker",
    );
  });

  it("is case-insensitive but keeps original casing in output", () => {
    expect(frameOf(<Highlight text="FOO-bar-Foo" query="foo" />)).toBe(
      "FOO-bar-Foo",
    );
  });

  it("handles consecutive non-overlapping occurrences", () => {
    expect(frameOf(<Highlight text="foofoo" query="foo" />)).toBe("foofoo");
  });

  it("returns text unchanged when no match", () => {
    expect(frameOf(<Highlight text="hello" query="zzz" />)).toBe("hello");
  });

  it("composes inside a styled parent Text (Ink smoke test)", () => {
    const { lastFrame, unmount } = render(
      <Text backgroundColor="cyan">
        <Highlight text="hello world" query="world" backgroundColor="cyan" />
      </Text>,
    );
    expect((lastFrame() ?? "").trimEnd()).toContain("hello world");
    unmount();
  });
});
