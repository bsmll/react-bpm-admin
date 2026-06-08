type IdleRequestCallback = () => void;

type IdleRequestOptions = {
  timeout?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

export const runWhenIdle = (
  task: () => void,
  options?: { timeout?: number; delay?: number },
): (() => void) => {
  const { timeout = 5000, delay = 0 } = options ?? {};
  const win = window as IdleWindow;

  const runTask = () => {
    if ("requestIdleCallback" in win && win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => task(), { timeout });

      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(task, delay || 2000);
    return () => clearTimeout(timer);
  };

  if (delay > 0) {
    const delayTimer = window.setTimeout(() => {
      cancel = runTask();
    }, delay);
    let cancel: (() => void) | undefined;
    return () => {
      clearTimeout(delayTimer);
      cancel?.();
    };
  }

  return runTask();
};
