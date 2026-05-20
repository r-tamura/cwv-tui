import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type InputContextValue = {
  textInputActive: boolean;
  /** Acquire/release the "text input is capturing keys" flag. Returns release fn. */
  acquireTextInput: () => () => void;
};

const InputContext = createContext<InputContextValue | undefined>(undefined);

export function InputProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const counterRef = useRef(0);

  const acquireTextInput = useCallback(() => {
    counterRef.current += 1;
    setCount(counterRef.current);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      counterRef.current = Math.max(0, counterRef.current - 1);
      setCount(counterRef.current);
    };
  }, []);

  const value: InputContextValue = {
    textInputActive: count > 0,
    acquireTextInput,
  };
  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
}

export function useInputContext(): InputContextValue {
  const ctx = useContext(InputContext);
  if (!ctx) {
    // Allow components to render without provider in tests
    return {
      textInputActive: false,
      acquireTextInput: () => () => {},
    };
  }
  return ctx;
}

/** Convenience: acquire the lock for the lifetime of a boolean flag. */
export function useTextInputLock(active: boolean): void {
  const { acquireTextInput } = useInputContext();
  React.useEffect(() => {
    if (!active) return;
    return acquireTextInput();
  }, [active, acquireTextInput]);
}
