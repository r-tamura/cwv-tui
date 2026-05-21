export type Route =
  | { kind: "groups" }
  | { kind: "streams"; logGroupName: string }
  | { kind: "events"; logGroupName: string; logStreamName: string }
  | { kind: "insights"; logGroupName?: string }
  | { kind: "liveTail"; logGroupName: string };

export type NavState = {
  stack: Route[];
};

export type NavAction =
  | { type: "PUSH"; route: Route }
  | { type: "POP" }
  | { type: "REPLACE"; route: Route }
  | { type: "HOME" };

export const initialNavState: NavState = {
  stack: [{ kind: "groups" }],
};

export function navigationReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "PUSH":
      return { stack: [...state.stack, action.route] };
    case "POP":
      if (state.stack.length <= 1) return state;
      return { stack: state.stack.slice(0, -1) };
    case "REPLACE":
      if (state.stack.length === 0) return { stack: [action.route] };
      return { stack: [...state.stack.slice(0, -1), action.route] };
    case "HOME":
      return initialNavState;
  }
}

export function currentRoute(state: NavState): Route {
  const top = state.stack[state.stack.length - 1];
  return top ?? { kind: "groups" };
}

export function canGoBack(state: NavState): boolean {
  return state.stack.length > 1;
}
