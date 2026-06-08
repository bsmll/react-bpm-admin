type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
};

export const shouldPrefetch = (): boolean => {
  const conn = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")
    return false;
  return true;
};

export const loadDesignerView = () => import("../views/DesignerView");

let designerPrefetchPromise: Promise<unknown> | null = null;

export const prefetchDesignerView = (source: "idle" | "hover") => {
  if (!shouldPrefetch()) return;

  if (!designerPrefetchPromise) {
    const t0 = performance.now();
    console.log(
      `%c[perf] prefetch DesignerView (${source})`,
      "color:#fa0;font-weight:bold;",
    );

    designerPrefetchPromise = loadDesignerView().then((mod) => {
      const ms = performance.now() - t0;
      console.log(
        `%c[perf] DesignerView 预取完成 (${source}): ${ms.toFixed(2)} ms`,
        "color:#0f0;font-weight:bold;",
      );
      return mod;
    });
  }
  return designerPrefetchPromise;
};

export const loadProcessDesigner = () =>
  import("../components/designer/ProcessDesigner");

let processDesignerPrefetchPromise: Promise<unknown> | null = null;

export const prefetchProcessDesigner = (source: "idle" | "hover") => {
  if (!shouldPrefetch()) return;

  if (!processDesignerPrefetchPromise) {
    const t0 = performance.now();
    processDesignerPrefetchPromise = loadProcessDesigner().then((mod) => {
      const ms = performance.now() - t0;
      console.log(
        `%c[perf] ProcessDesigner 预取完成 (${source}): ${ms.toFixed(2)} ms`,
        "color:#0f0;font-weight:bold;",
      );
      return mod;
    });
  }
  return processDesignerPrefetchPromise;
};

export const prefetchDesignerFull = (source: "idle" | "hover") => {
  return Promise.all([
    prefetchDesignerView(source),
    prefetchProcessDesigner(source),
  ]);
};
