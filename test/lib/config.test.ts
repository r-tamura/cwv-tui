import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, parseConfig } from "../../src/lib/config.js";

describe("parseConfig", () => {
  it("parses a minimal valid YAML and applies defaults", () => {
    const yaml = `
defaultDashboard: lambda-prod
dashboards:
  lambda-prod:
    title: Lambda Production
    charts:
      - title: Errors
        namespace: AWS/Lambda
        metric: Errors
`;
    const cfg = parseConfig(yaml);
    expect(cfg.defaultDashboard).toBe("lambda-prod");
    expect(cfg.dashboards["lambda-prod"]?.title).toBe("Lambda Production");
    const chart = cfg.dashboards["lambda-prod"]?.charts[0];
    expect(chart).toMatchObject({
      title: "Errors",
      namespace: "AWS/Lambda",
      metric: "Errors",
      stat: "Average",
      height: 8,
      dimensions: {},
      logGroups: [],
    });
    expect(chart?.id).toBe("c_lambda-prod_0");
  });

  it("derives chart ids by index", () => {
    const yaml = `
defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts:
      - title: A
        namespace: NS
        metric: M
      - title: B
        namespace: NS
        metric: M
`;
    const cfg = parseConfig(yaml);
    expect(cfg.dashboards.d1?.charts.map((c) => c.id)).toEqual([
      "c_d1_0",
      "c_d1_1",
    ]);
  });

  it("populates DashboardSpec.id from its key", () => {
    const yaml = `
defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts: []
`;
    const cfg = parseConfig(yaml);
    expect(cfg.dashboards.d1?.id).toBe("d1");
  });

  it("preserves explicit stat and percentile statistics", () => {
    const yaml = `
defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts:
      - title: P99
        namespace: AWS/Lambda
        metric: Duration
        stat: p99
        height: 12
        dimensions:
          FunctionName: foo
        logGroups:
          - /aws/lambda/foo
`;
    const cfg = parseConfig(yaml);
    const chart = cfg.dashboards.d1?.charts[0];
    expect(chart?.stat).toBe("p99");
    expect(chart?.height).toBe(12);
    expect(chart?.dimensions).toEqual({ FunctionName: "foo" });
    expect(chart?.logGroups).toEqual(["/aws/lambda/foo"]);
  });

  it("throws when defaultDashboard is missing", () => {
    const yaml = `
dashboards:
  d1:
    title: D1
    charts: []
`;
    expect(() => parseConfig(yaml)).toThrow(/defaultDashboard/);
  });

  it("throws when a chart is missing a required field", () => {
    const yaml = `
defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts:
      - title: Bad
        namespace: AWS/Lambda
`;
    expect(() => parseConfig(yaml)).toThrow(/metric/);
  });

  it("throws when stat is not a known statistic", () => {
    const yaml = `
defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts:
      - title: Bad
        namespace: AWS/Lambda
        metric: M
        stat: p101
`;
    expect(() => parseConfig(yaml)).toThrow();
  });

  it("throws a friendly error on malformed YAML", () => {
    expect(() => parseConfig(":\n  - this is: not\nvalid: [")).toThrow();
  });
});

describe("loadConfig", () => {
  let tmpDir: string;
  const originalHome = process.env.HOME;
  const originalCfg = process.env.CWV_TUI_CONFIG;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cwv-tui-cfg-"));
    delete process.env.CWV_TUI_CONFIG;
    // Point HOME away from real config so the home-path branch can be
    // exercised deterministically by each test that wants it.
    process.env.HOME = tmpDir;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    // Restore individual env keys; `process.env = ...` does not replace
    // the special object so keys set by a test would leak otherwise.
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalCfg === undefined) delete process.env.CWV_TUI_CONFIG;
    else process.env.CWV_TUI_CONFIG = originalCfg;
  });

  it("loads from an explicit path argument", async () => {
    const p = join(tmpDir, "explicit.yaml");
    writeFileSync(
      p,
      `defaultDashboard: d1
dashboards:
  d1:
    title: D1
    charts: []
`,
    );
    const cfg = await loadConfig(p);
    expect(cfg?.defaultDashboard).toBe("d1");
  });

  it("falls back to $CWV_TUI_CONFIG", async () => {
    const p = join(tmpDir, "env.yaml");
    writeFileSync(
      p,
      `defaultDashboard: d_env
dashboards:
  d_env:
    title: From Env
    charts: []
`,
    );
    process.env.CWV_TUI_CONFIG = p;
    const cfg = await loadConfig();
    expect(cfg?.defaultDashboard).toBe("d_env");
  });

  it("falls back to ~/.config/cwv-tui/dashboards.yaml", async () => {
    const dir = join(tmpDir, ".config", "cwv-tui");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "dashboards.yaml"),
      `defaultDashboard: d_home
dashboards:
  d_home:
    title: From Home
    charts: []
`,
    );
    const cfg = await loadConfig();
    expect(cfg?.defaultDashboard).toBe("d_home");
  });

  it("returns undefined when no config exists", async () => {
    const cfg = await loadConfig();
    expect(cfg).toBeUndefined();
  });

  it("rethrows with a helpful message on schema errors", async () => {
    const p = join(tmpDir, "bad.yaml");
    writeFileSync(p, "this_is: not_a_dashboard");
    await expect(loadConfig(p)).rejects.toThrow(/dashboards|config/i);
  });
});
