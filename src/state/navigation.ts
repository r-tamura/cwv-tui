export type Mode = "dashboard" | "alarms" | "logs";

export type Route =
  // dashboard mode
  | { kind: "dashboard"; dashboardId: string }
  // alarms mode
  | { kind: "alarms" }
  | { kind: "alarmDetail"; alarmName: string }
  // logs mode (existing v0.2 routes)
  | { kind: "groups" }
  | { kind: "streams"; logGroupName: string }
  | { kind: "events"; logGroupName: string; logStreamName: string }
  | { kind: "insights"; logGroupName?: string }
  | { kind: "liveTail"; logGroupName: string };

/**
 * Each top-level mode owns its own back-stack so Tab-switching modes
 * preserves where the user was inside each. v0.2 callers that only know
 * about the logs mode still see the same behavior because mode defaults
 * to "logs" and the logs stack starts on the Log Groups route.
 */
export type NavState = {
  mode: Mode;
  stacks: Record<Mode, Route[]>;
};

export type NavAction =
  | { type: "PUSH"; route: Route }
  | { type: "POP" }
  | { type: "REPLACE"; route: Route }
  | { type: "HOME" }
  | { type: "SET_MODE"; mode: Mode }
  /** Used by App after config loads to seed the dashboard stack. */
  | { type: "SET_DASHBOARD_STACK"; dashboardId: string };

export const initialNavState: NavState = {
  mode: "logs",
  stacks: {
    dashboard: [],
    alarms: [{ kind: "alarms" }],
    logs: [{ kind: "groups" }],
  },
};

function withStack(
  state: NavState,
  mode: Mode,
  next: Route[],
): NavState {
  return {
    ...state,
    stacks: { ...state.stacks, [mode]: next },
  };
}

export function navigationReducer(state: NavState, action: NavAction): NavState {
  const stack = state.stacks[state.mode];
  switch (action.type) {
    case "PUSH":
      return withStack(state, state.mode, [...stack, action.route]);
    case "POP":
      if (stack.length <= 1) return state;
      return withStack(state, state.mode, stack.slice(0, -1));
    case "REPLACE":
      if (stack.length === 0) {
        return withStack(state, state.mode, [action.route]);
      }
      return withStack(state, state.mode, [
        ...stack.slice(0, -1),
        action.route,
      ]);
    case "HOME":
      return initialNavState;
    case "SET_MODE":
      if (action.mode === state.mode) return state;
      return { ...state, mode: action.mode };
    case "SET_DASHBOARD_STACK":
      return withStack(state, "dashboard", [
        { kind: "dashboard", dashboardId: action.dashboardId },
      ]);
  }
}

export function currentRoute(state: NavState): Route {
  const stack = state.stacks[state.mode];
  const top = stack[stack.length - 1];
  if (top) return top;
  // Defensive fallback. With initialNavState every mode has at least one
  // route except `dashboard` (seeded only after config loads). When the
  // dashboard mode is empty we still surface a stable route so callers
  // don't have to special-case undefined.
  if (state.mode === "dashboard") return { kind: "alarms" };
  return { kind: "groups" };
}

export function canGoBack(state: NavState): boolean {
  return state.stacks[state.mode].length > 1;
}

/** True only when every visible mode has its initial-or-empty stack. */
export function isAtRootEverywhere(state: NavState): boolean {
  return (
    state.stacks.dashboard.length <= 1 &&
    state.stacks.alarms.length <= 1 &&
    state.stacks.logs.length <= 1
  );
}
