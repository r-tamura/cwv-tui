import type { DashboardConfig } from "../types.js";

/**
 * Track 0 stub. Implemented in Track A.
 *
 * Loads and validates the YAML dashboard config. Path resolution order:
 *   1. explicit `path` argument if provided
 *   2. $CWV_TUI_CONFIG env var
 *   3. ~/.config/cwv-tui/dashboards.yaml
 *   4. ./cwv-tui.yaml
 *
 * Returns undefined when no config is found (v0.2-compat mode).
 * Throws a Zod-flavored error with line context on invalid YAML.
 */
export async function loadConfig(
  _path?: string,
): Promise<DashboardConfig | undefined> {
  throw new Error("Not implemented yet (Track A)");
}

/**
 * Track 0 stub. Implemented in Track A. Exported for unit tests.
 */
export function parseConfig(_yamlText: string): DashboardConfig {
  throw new Error("Not implemented yet (Track A)");
}
