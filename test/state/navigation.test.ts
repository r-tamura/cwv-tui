import { describe, expect, it } from "vitest";
import {
  canGoBack,
  currentRoute,
  initialNavState,
  navigationReducer,
} from "../../src/state/navigation.js";

describe("navigationReducer", () => {
  it("starts on the groups route", () => {
    expect(currentRoute(initialNavState).kind).toBe("groups");
    expect(canGoBack(initialNavState)).toBe(false);
  });

  it("PUSH appends a route", () => {
    const next = navigationReducer(initialNavState, {
      type: "PUSH",
      route: { kind: "streams", logGroupName: "/aws/lambda/x" },
    });
    expect(next.stack).toHaveLength(2);
    expect(currentRoute(next)).toEqual({
      kind: "streams",
      logGroupName: "/aws/lambda/x",
    });
    expect(canGoBack(next)).toBe(true);
  });

  it("POP removes the top route but not below root", () => {
    const pushed = navigationReducer(initialNavState, {
      type: "PUSH",
      route: { kind: "streams", logGroupName: "/x" },
    });
    const popped = navigationReducer(pushed, { type: "POP" });
    expect(popped.stack).toHaveLength(1);

    // POP at root is a no-op
    const popAgain = navigationReducer(popped, { type: "POP" });
    expect(popAgain).toBe(popped);
  });

  it("REPLACE swaps the top route", () => {
    const replaced = navigationReducer(initialNavState, {
      type: "REPLACE",
      route: { kind: "insights" },
    });
    expect(replaced.stack).toHaveLength(1);
    expect(currentRoute(replaced).kind).toBe("insights");
  });

  it("PUSH can push a liveTail route", () => {
    const next = navigationReducer(initialNavState, {
      type: "PUSH",
      route: { kind: "liveTail", logGroupName: "/aws/lambda/x" },
    });
    expect(currentRoute(next)).toEqual({
      kind: "liveTail",
      logGroupName: "/aws/lambda/x",
    });
  });

  it("HOME resets to initial state", () => {
    const deep = navigationReducer(
      navigationReducer(initialNavState, {
        type: "PUSH",
        route: { kind: "streams", logGroupName: "/x" },
      }),
      {
        type: "PUSH",
        route: { kind: "events", logGroupName: "/x", logStreamName: "s" },
      },
    );
    const home = navigationReducer(deep, { type: "HOME" });
    expect(home).toEqual(initialNavState);
  });
});
