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

export const prefetchDesignerView = () => {
  if (!shouldPrefetch()) return;

  if (!designerPrefetchPromise) {
    designerPrefetchPromise = loadDesignerView();
  }
  return designerPrefetchPromise;
};

export const loadProcessDesigner = () =>
  import("../components/designer/ProcessDesigner");

let processDesignerPrefetchPromise: Promise<unknown> | null = null;

export const prefetchProcessDesigner = () => {
  if (!shouldPrefetch()) return;

  if (!processDesignerPrefetchPromise) {
    processDesignerPrefetchPromise = loadProcessDesigner();
  }
  return processDesignerPrefetchPromise;
};

export const prefetchDesignerFull = () =>
  Promise.all([prefetchDesignerView(), prefetchProcessDesigner()]);
