import { useEffect, useMemo } from "react";

/** A new action supersedes earlier results and their delayed feedback. */
export function useLatestAction() {
  const action = useMemo(() => {
    let sequence = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const start = () => {
      timers.forEach(clearTimeout);
      timers.clear();
      return ++sequence;
    };
    const isCurrent = (id: number) => id === sequence;
    const schedule = (id: number, callback: () => void, delay: number) => {
      if (!isCurrent(id)) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (isCurrent(id)) callback();
      }, delay);
      timers.add(timer);
    };
    return { start, isCurrent, schedule };
  }, []);

  useEffect(
    () => () => {
      action.start();
    },
    [action],
  );
  return action;
}
