import { afterEach, describe, expect, it, vi } from "vitest";
import { PRESETS, presetById, rangeWindowMs } from "../../src/lib/timeRange.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("rangeWindowMs", () => {
  it("computes start/end relative to now for each preset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const { startMs, endMs } = rangeWindowMs("1h");
    expect(endMs).toBe(Date.parse("2026-05-21T12:00:00Z"));
    expect(startMs).toBe(Date.parse("2026-05-21T11:00:00Z"));
  });

  it("supports the 15m preset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const { startMs, endMs } = rangeWindowMs("15m");
    expect(endMs - startMs).toBe(15 * 60_000);
  });

  it("supports the 7d preset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T12:00:00Z"));
    const { startMs, endMs } = rangeWindowMs("7d");
    expect(endMs - startMs).toBe(7 * 24 * 60 * 60_000);
  });
});

describe("PRESETS", () => {
  it("exposes ordered presets", () => {
    expect(PRESETS.map((p) => p.id)).toEqual([
      "15m",
      "1h",
      "6h",
      "24h",
      "7d",
    ]);
  });

  it("each preset has a non-empty label", () => {
    for (const p of PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("presetById", () => {
  it("returns the matching preset", () => {
    expect(presetById("1h")?.description).toBe("1 hour");
    expect(presetById("1h")?.label).toBe("1h");
  });

  it("returns undefined for unknown ids", () => {
    // @ts-expect-error - intentional bad id
    expect(presetById("nope")).toBeUndefined();
  });
});
