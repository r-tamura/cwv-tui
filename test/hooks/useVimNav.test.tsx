import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { Box } from "ink";
import React, { useState } from "react";
import { useVimNav } from "../../src/hooks/useVimNav.js";

const CTRL_D = "\x04";
const CTRL_U = "\x15";
const CTRL_F = "\x06";
const CTRL_B = "\x02";

function flush() {
  return new Promise<void>((r) => setImmediate(r));
}

type ProbeProps = {
  length: number;
  pageSize?: number;
  initial?: number;
  onChange?: (cursor: number) => void;
  ggTimeoutMs?: number;
};

function Probe({ length, pageSize = 10, initial = 0, onChange, ggTimeoutMs }: ProbeProps) {
  const [cursor, setCursor] = useState(initial);
  useVimNav({
    length,
    pageSize,
    cursor,
    setCursor: (n) => {
      setCursor(n);
      onChange?.(n);
    },
    isActive: true,
    ggTimeoutMs,
  });
  return <Box />;
}

describe("useVimNav", () => {
  it("j moves down, k moves up, clamped to bounds", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(<Probe length={5} onChange={onChange} />);
    await flush();
    stdin.write("j");
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(1);
    stdin.write("j");
    stdin.write("j");
    stdin.write("j");
    stdin.write("j"); // would overshoot
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(4);
    stdin.write("k");
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(3);
    unmount();
  });

  it("G jumps to last, gg jumps to first", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(<Probe length={20} onChange={onChange} />);
    await flush();
    stdin.write("G");
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(19);
    stdin.write("g");
    await flush();
    stdin.write("g");
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(0);
    unmount();
  });

  it("a single g does nothing, but g + g within timeout jumps to top", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <Probe length={10} initial={5} onChange={onChange} />,
    );
    await flush();
    stdin.write("g");
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    stdin.write("g");
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(0);
    unmount();
  });

  it("any non-g key between two g presses cancels the pending gg", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <Probe length={10} initial={5} onChange={onChange} />,
    );
    await flush();
    stdin.write("g");
    await flush();
    stdin.write("j");
    await flush();
    onChange.mockClear();
    stdin.write("g");
    await flush();
    expect(onChange).not.toHaveBeenCalled();
    unmount();
  });

  it("Ctrl+D and Ctrl+U jump by half pageSize", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <Probe length={100} pageSize={20} initial={50} onChange={onChange} />,
    );
    await flush();
    stdin.write(CTRL_D);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(60);
    stdin.write(CTRL_U);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(50);
    unmount();
  });

  it("Ctrl+F and Ctrl+B jump by full pageSize", async () => {
    const onChange = vi.fn();
    const { stdin, unmount } = render(
      <Probe length={100} pageSize={20} initial={50} onChange={onChange} />,
    );
    await flush();
    stdin.write(CTRL_F);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(70);
    stdin.write(CTRL_B);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(50);
    unmount();
  });
});
