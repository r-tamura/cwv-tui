export type ParsedArgs = {
  profile?: string;
  region?: string;
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
      default:
        if (a?.startsWith("--profile=")) {
          out.profile = a.slice("--profile=".length);
        } else if (a?.startsWith("--region=")) {
          out.region = a.slice("--region=".length);
        }
    }
  }
  return out;
}

export const HELP_TEXT = `cwv-tui — CloudWatch Logs TUI

Usage:
  cwv-tui [--profile <name>] [--region <name>]

Options:
  --profile <name>   AWS profile name (overrides AWS_PROFILE)
  --region <name>    AWS region (overrides AWS_REGION)
  -h, --help         Show this help
  -v, --version      Show version

Keys:
  ↑↓ / jk    Move          /          Filter
  Enter      Drill in      Esc        Back
  i          Insights      r          Reload
  q          Quit
`;
