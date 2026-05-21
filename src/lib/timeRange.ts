export type RangeId = "15m" | "1h" | "6h" | "24h" | "7d";

export type RangePreset = {
  id: RangeId;
  /** Short label shown in headers, e.g. "1h". */
  label: string;
  /** Long label shown inside the picker, e.g. "1 hour". */
  description: string;
  ms: number;
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const PRESETS: readonly RangePreset[] = [
  { id: "15m", label: "15m", description: "15 minutes", ms: 15 * MINUTE_MS },
  { id: "1h", label: "1h", description: "1 hour", ms: HOUR_MS },
  { id: "6h", label: "6h", description: "6 hours", ms: 6 * HOUR_MS },
  { id: "24h", label: "24h", description: "24 hours", ms: DAY_MS },
  { id: "7d", label: "7d", description: "7 days", ms: 7 * DAY_MS },
];

export function presetById(id: RangeId): RangePreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function rangeWindowMs(id: RangeId): { startMs: number; endMs: number } {
  const preset = presetById(id);
  if (!preset) {
    throw new Error(`Unknown range preset: ${id}`);
  }
  const endMs = Date.now();
  return { startMs: endMs - preset.ms, endMs };
}
