// src/hooks/useVirtualList.ts
import { useState, useMemo, useEffect, useCallback, useRef } from "react";

interface ItemPosition {
  index: number;
  top: number;
  height: number;
  bottom: number;
}

export interface VirtualListOptions<T> {
  list: T[]; // React 中直接传数组，不需要 Ref
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualListResult<T> {
  visibleData: T[];
  totalHeight: number;
  offsetY: number;
  startIndex: number;
  endIndex: number;
  handleScroll: (event: React.UIEvent<HTMLElement>) => void;
  updateItemSize: (index: number, height: number) => void;
}

export function useVirtualList<T>(
  options: VirtualListOptions<T>,
): VirtualListResult<T> {
  const {
    list,
    estimatedItemHeight = 60,
    containerHeight,
    overscan = 5,
  } = options;

  // 状态定义
  const positions = useRef<ItemPosition[]>([]);

  const [listHeight, setListHeight] = useState(
    () => list.length * estimatedItemHeight,
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const pendingUpdatas = useRef<{ index: number; height: number }[]>([]);
  const updateRafId = useRef<number | null>(null);
  const scrollRafId = useRef<number | null>(null);

  useMemo(() => {
    if (positions.current.length !== list.length) {
      positions.current = list.map((_, index) => ({
        index,
        top: index * estimatedItemHeight,
        height: estimatedItemHeight,
        bottom: (index + 1) * estimatedItemHeight,
      }));
      // 只在 list 发生变化（初始化）时，设置一次总高度
      setListHeight(list.length * estimatedItemHeight);
    }
  }, [list, estimatedItemHeight]);

  const getStartIndex = useCallback((currentScrollTop: number) => {
    let low = 0;
    let high = positions.current.length - 1;
    let index = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bottom = positions.current[mid].bottom;

      if (bottom > currentScrollTop) {
        index = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return index;
  }, []);

  // 更新可见范围的逻辑 (封装为 useCallback 以便复用)
  const updateVisibleRange = useCallback(
    (currentScrollTop: number) => {
      const startIndex = Math.max(
        0,
        getStartIndex(currentScrollTop) - overscan,
      );
      const endIndex = Math.min(
        getStartIndex(currentScrollTop + containerHeight) + 1 + overscan,
        list.length,
      );

      setStartIndex(startIndex);
      setEndIndex(endIndex);
      setOffsetY(positions.current[startIndex]?.top || 0);
    },
    [list.length, estimatedItemHeight, containerHeight, overscan],
  );

  // 处理滚动事件 (对应 Vue 的 handleScroll)
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const target = event.currentTarget;
      const currentScrollTop = target.scrollTop;

      if (scrollRafId.current == null) {
        scrollRafId.current = requestAnimationFrame(() => {
          setScrollTop(currentScrollTop);
          updateVisibleRange(currentScrollTop);
          scrollRafId.current = null;
        });
      }
    },
    [updateVisibleRange],
  );

  const updateItemSize = useCallback((index: number, height: number) => {
    pendingUpdatas.current.push({ index, height });

    if (updateRafId.current == null) {
      updateRafId.current = requestAnimationFrame(() => {
        updateRafId.current = null;
        const updates = pendingUpdatas.current;
        pendingUpdatas.current = [];

        const cache = positions.current;
        let minIndex = cache.length - 1;
        let changed = false;

        for (const { index, height } of updates) {
          if (!cache[index]) continue;
          if (cache[index].height !== height) {
            cache[index].height = height;
            minIndex = Math.min(minIndex, index);
            changed = true;
          }
        }

        if (changed) {
          for (let i = minIndex; i < cache.length; i++) {
            if (i === 0) {
              cache[i].top = 0;
            } else {
              cache[i].top = cache[i - 1].bottom;
            }
            cache[i].bottom = cache[i].top + cache[i].height;
          }
        }
        setListHeight(cache[cache.length - 1].bottom);
      });
    }
  }, []);

  // 初始化 (对应 Vue 的 onMounted)
  useEffect(() => {
    updateVisibleRange(scrollTop);
  }, [updateVisibleRange, scrollTop]);

  // 计算可见数据 (对应 Vue 的 computed)
  const visibleData = useMemo(() => {
    return list.slice(startIndex, endIndex);
  }, [list, startIndex, endIndex]);

  return {
    visibleData,
    totalHeight: listHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
    updateItemSize,
  };
}
