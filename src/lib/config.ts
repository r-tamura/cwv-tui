import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { load as loadYaml } from "js-yaml";
import { z, ZodError } from "zod";
import type {
  ChartSpec,
  DashboardConfig,
  DashboardSpec,
  Statistic,
} from "../types.js";

const STATISTICS = [
  "Sum",
  "Average",
  "Maximum",
  "Minimum",
  "SampleCount",
  "p50",
  "p90",
  "p95",
  "p99",
] as const satisfies readonly Statistic[];

const chartSchema = z.object({
  title: z.string().min(1),
  namespace: z.string().min(1),
  metric: z.string().min(1),
  dimensions: z.record(z.string(), z.string()).optional(),
  stat: z.enum(STATISTICS).optional(),
  height: z.number().int().positive().optional(),
  logGroups: z.array(z.string()).optional(),
});

const dashboardSchema = z.object({
  title: z.string().min(1),
  charts: z.array(chartSchema),
});

const configSchema = z.object({
  defaultDashboard: z.string().min(1),
  dashboards: z.record(z.string(), dashboardSchema),
});

type RawChart = z.infer<typeof chartSchema>;
type RawDashboard = z.infer<typeof dashboardSchema>;
type RawConfig = z.infer<typeof configSchema>;

function materialiseChart(
  raw: RawChart,
  dashboardId: string,
  index: number,
): ChartSpec {
  return {
    id: `c_${dashboardId}_${index}`,
    title: raw.title,
    namespace: raw.namespace,
    metric: raw.metric,
    dimensions: raw.dimensions ?? {},
    stat: raw.stat ?? "Average",
    height: raw.height ?? 8,
    logGroups: raw.logGroups ?? [],
  };
}

function materialiseDashboard(
  raw: RawDashboard,
  dashboardId: string,
): DashboardSpec {
  return {
    id: dashboardId,
    title: raw.title,
    charts: raw.charts.map((c, i) => materialiseChart(c, dashboardId, i)),
  };
}

function materialise(raw: RawConfig): DashboardConfig {
  const dashboards: Record<string, DashboardSpec> = {};
  for (const [id, dash] of Object.entries(raw.dashboards)) {
    dashboards[id] = materialiseDashboard(dash, id);
  }
  return {
    defaultDashboard: raw.defaultDashboard,
    dashboards,
  };
}

function formatZodError(err: ZodError): string {
  const lines = err.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `  - ${path}: ${issue.message}`;
  });
  return [
    "Invalid cwv-tui dashboard config:",
    ...lines,
    "",
    "See docs/plans/2026-05-22-v0.3-metrics-dashboard-design.md for the schema.",
  ].join("\n");
}

/**
 * Parse a YAML string into a validated DashboardConfig. Pure function; thrown
 * errors carry a multi-line message suitable for direct CLI display.
 */
export function parseConfig(yamlText: string): DashboardConfig {
  let raw: unknown;
  try {
    raw = loadYaml(yamlText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not parse cwv-tui config as YAML:\n  ${msg}`);
  }
  try {
    const parsed = configSchema.parse(raw);
    return materialise(parsed);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new Error(formatZodError(e));
    }
    throw e;
  }
}

function candidatePaths(explicit: string | undefined): string[] {
  if (explicit) return [resolve(explicit)];
  const env = process.env.CWV_TUI_CONFIG;
  const out: string[] = [];
  if (env && env.length > 0) out.push(resolve(env));
  out.push(resolve(homedir(), ".config", "cwv-tui", "dashboards.yaml"));
  out.push(resolve(process.cwd(), "cwv-tui.yaml"));
  return out;
}

/**
 * Load the dashboard config from the first path that exists. Path resolution
 * order:
 *   1. explicit `path` argument
 *   2. $CWV_TUI_CONFIG
 *   3. ~/.config/cwv-tui/dashboards.yaml
 *   4. ./cwv-tui.yaml
 *
 * Returns `undefined` when nothing is found so the caller can fall back to
 * the v0.2-compatible (logs-only) experience. Throws with a helpful message
 * when a file is found but fails YAML or schema validation.
 */
export async function loadConfig(
  path?: string,
): Promise<DashboardConfig | undefined> {
  for (const p of candidatePaths(path)) {
    if (!existsSync(p)) continue;
    let text: string;
    try {
      text = readFileSync(p, "utf8");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not read cwv-tui config at ${p}:\n  ${msg}`);
    }
    try {
      return parseConfig(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`${msg}\n(config file: ${p})`);
    }
  }
  return undefined;
}
