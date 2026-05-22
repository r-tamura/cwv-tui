export type ParsedArgs = {
  profile?: string;
  region?: string;
  configPath?: string;
  help: boolean;
  version: boolean;
};

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = { help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        out.help = true;
        break;
      case "-v":
      case "--version":
        out.version = true;
        break;
      case "--profile":
        out.profile = argv[++i];
        break;
      case "--region":
        out.region = argv[++i];
        break;
      case "--config":
        out.configPath = argv[++i];
        break;
      default:
        if (a?.startsWith("--profile=")) {
          out.profile = a.slice("--profile=".length);
        } else if (a?.startsWith("--region=")) {
          out.region = a.slice("--region=".length);
        } else if (a?.startsWith("--config=")) {
          out.configPath = a.slice("--config=".length);
        }
    }
  }
  return out;
}

export const HELP_TEXT = `cwv-tui — CloudWatch Logs & Metrics TUI

Usage:
  cwv-tui [--profile <name>] [--region <name>] [--config <path>]

Options:
  --profile <name>   AWS profile name (overrides AWS_PROFILE)
  --region <name>    AWS region (overrides AWS_REGION)
  --config <path>    Path to dashboards.yaml (overrides default search)
  -h, --help         Show this help
  -v, --version      Show version

Top-level modes:
  Tab / Shift+Tab    Cycle Dashboard / Alarms / Logs

Keys:
  ↑↓ / jk    Move          /          Filter
  Enter      Drill in      Esc        Back
  i          Insights      t          Live Tail (Logs) / time range (Dashboard / Insights)
  r          Reload        ?          Help
  q          Quit
`;
