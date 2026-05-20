// Minimal ANSI-CSI stripper for test assertions. ink-testing-library returns
// frames with embedded escape sequences when nested <Text> nodes change style.
const CSI = /\x1B\[[0-?]*[ -/]*[@-~]/g;

export function stripAnsi(s: string | undefined): string {
  return (s ?? "").replace(CSI, "");
}
